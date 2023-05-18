const jwt = require("jsonwebtoken");
const { dbConfig, connection } = require("../db/db");
const mysql = require("mysql");
// Handler function to add a new todo only admin access
const handelAddTodo = (req, res) => {
  try {
    const { title, description, status } = req.body;
    const token = req.headers.authorization;
    const user_email = req.headers.email;
    console.log(user_email);

    // Verify the access token
    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err)
        return res.status(401).send({ error: "cannot process req", err });
      const dbName = `tenant_${result.uuid}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };
      const pool1 = mysql.createPool(userDbConfig);
      pool1.getConnection((error, pool1) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "error while connecting to db", error });
        } else {
          //if connection done
          const query = "SELECT * FROM user WHERE email = ?";
          pool1.query(query, [user_email], (error, results) => {
            if (error) {
              return callback(error, null);
            }
            if (results.length === 0) {
              return res.send({ message: "User not found" }); // User not found
            } else {
              const user_id = results[0].id;
              // Create a new todo in the tenant's database
              const createTodoQuery =
                "INSERT INTO todo (title, description,status ,user_id) VALUES (?, ?, ?,?)";
              const createTodoValues = [title, description,status||0, user_id];
              pool1.query(createTodoQuery, createTodoValues, (err, result) => {
                if (err) {
                  pool1.release();
                  return res
                    .status(401)
                    .send({ error: "cannot process req", err });
                }
                pool1.release();
                res.status(200).send({ message: "Todo created successfully" });
              });
            }
          });
        }
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

// To delete todo only admin access
const handleDeleteTodo = (req, res) => {
  try {
    const todoId = req.params.id;

    const token = req.headers.authorization;
    const user_email = req.headers.email;

    // Verify the access token
    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err) {
        return res.status(401).send({ error: "Unauthorized", err });
      }

      const dbName = `tenant_${result.uuid}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };

      const pool = mysql.createPool(userDbConfig);
      pool.getConnection((error, connection) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "Error while connecting to the database", error });
        }

        // Check if the user exists
        const query = "SELECT * FROM user WHERE email = ?";
        connection.query(query, [user_email], (error, results) => {
          if (error) {
            connection.release();
            return res
              .status(401)
              .send({ error: "Error while executing the query", error });
          }

          if (results.length === 0) {
            connection.release();
            return res.status(404).send({ message: "User not found" });
          }

          const user_id = results[0].id;

          console.log(result.uuid);
          // Delete the todo from the tenant's database
          const deleteTodoQuery = "DELETE FROM todo WHERE id = ? ";
          const deleteTodoValues = [todoId];
          connection.query(deleteTodoQuery, deleteTodoValues, (err, result) => {
            connection.release();
            if (err) {
              return res
                .status(500)
                .send({ error: "Error while deleting the todo", err });
            }

            if (result.affectedRows === 0) {
              return res.status(404).send({ message: "Todo not found" });
            }

            console.log(result);
            res.status(200).send({ message: "Todo deleted successfully" });
          });
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

// To update todo only admin access
const handleUpdateTodo = (req, res) => {
  try {
    const todoId = req.params.id;
    const { title, description, status } = req.body;
    const token = req.headers.authorization;
    const user_email = req.headers.email;

    console.log(title, description, status, "testing");

    // Verify the access token
    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err) {
        return res.status(401).send({ error: "cannot process req", err });
      }

      const dbName = `tenant_${result.uuid}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };
      const pool1 = mysql.createPool(userDbConfig);

      pool1.getConnection((error, connection) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "error while connecting to db", error });
        }

        // Check if the user exists
        const query = "SELECT * FROM user WHERE email = ?";
        connection.query(query, [user_email], (error, results) => {
          if (error) {
            connection.release();
            return res.status(401).send({ error: "cannot process req", error });
          }

          if (results.length === 0) {
            connection.release();
            return res.send({ message: "User not found" });
          }

          const user_id = results[0].id;

          // Update the todo in the tenant's database
          const updateTodoQuery =
            "UPDATE todo SET title = ?, description = ?, status = ? WHERE id = ?";
          const updateTodoValues = [title, description, status, todoId];

          connection.query(updateTodoQuery, updateTodoValues, (err, result) => {
            connection.release();
            if (err) {
              return res.status(401).send({ error: "cannot process req", err });
            }

            if (result.affectedRows === 0) {
              return res.status(404).send({ message: "Todo not found" });
            }

            res.status(200).send({ message: "Todo updated successfully" });
          });
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

// To get all todo from a perticular user
const handleGetTodo = (req, res) => {
  try {
    const todoId = req.params.id;
    const token = req.headers.authorization;
    const user_email = req.headers.email;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;

    // console.log(offset,"offset",page,limit);

    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err)
        return res.status(401).send({ error: "cannot process req", err });

      const dbName = `tenant_${result.org_id}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };
      const pool1 = mysql.createPool(userDbConfig);
      pool1.getConnection((error, pool1) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "error while connecting to db", error });
        } else {
          const query = "SELECT * FROM user WHERE email = ?";
          pool1.query(query, [user_email], (error, results) => {
            if (error) {
              return res
                .status(401)
                .send({ error: "cannot process req", error });
            }
            if (results.length === 0) {
              return res.send({ message: "User not found" });
            } else {
              const user_id = results[0].id;

              const getTodoQuery =
                "SELECT * FROM todo WHERE user_id = ? LIMIT ? OFFSET ?";
              const getTodoValues = [
                user_id,
                parseInt(limit),
                parseInt(offset),
              ];
              pool1.query(getTodoQuery, getTodoValues, (err, result) => {
                if (err) {
                  return res
                    .status(401)
                    .send({ error: "cannot process req", err });
                }
                if (result.length === 0) {
                  return res.send([]);
                } else {
                  pool1.release();
                  res.status(200).send(result);
                }
              });
            }
          });
        }
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

// to get all todo only admin access
const handleGetAllTodo = (req, res) => {
  try {
    const tenantId = req.headers.tenant_uuid;
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    // Connect to the tenant database
    const dbName = `tenant_${tenantId}`;
    const userDbConfig = {
      ...dbConfig,
      database: dbName,
    };
    const pool1 = mysql.createPool(userDbConfig);

    pool1.getConnection((error, connection) => {
      if (error) {
        return res
          .status(401)
          .send({ error: "error while connecting to the database", error });
      }
      const query = "SELECT * FROM todo LIMIT ? OFFSET ?";
      const values = [parseInt(limit), parseInt(offset)];
      connection.query(query, values, (err, results) => {
        connection.release();
        if (err) {
          return res.status(401).send({ error: "cannot process request", err });
        }
        res.send(results);
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

const handelAddUserTodo = async(req, res) => {
  try {
    const { title, description, status, timelimit } = req.body;
    const token = req.headers.authorization;
    const user_email = req.headers.email;
    const nextday_limit=await getCurrentDateTime()
  
    // Verify the access token
    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err) {
        return res.status(401).send({ error: "cannot process req", err });
      } else {
        const dbName = `tenant_${result.org_id}`;
        const userDbConfig = {
          ...dbConfig,
          database: dbName,
        };
        const pool1 = mysql.createPool(userDbConfig);
        pool1.getConnection((error, pool1) => {
          if (error) {
            return res
              .status(401)
              .send({ error: "error while connecting to db", error });
          } else {
            //if connection done
            const query = "SELECT * FROM user WHERE email = ?";
            pool1.query(query, [user_email], (error, results) => {
              if (error) {
                return callback(error, null);
              }
              if (results.length === 0) {
                return res.send({ message: "User not found" }); // User not found
              } else {
                const user_id = results[0].id;
                // Create a new todo in the tenant's database

                console.log(timelimit,"time limit")
                const createTodoQuery =
                  "INSERT INTO todo (title, description,user_id,status,deadline_time) VALUES (?, ?, ?, ?, ?)";
                const createTodoValues = [
                  title,
                  description,
                  user_id,
                  status || 0,
                  
                  timelimit||nextday_limit.future
                ];
                pool1.query(
                  createTodoQuery,
                  createTodoValues,
                  (err, result) => {
                    if (err) {
                      pool1.release();
                      return res
                        .status(401)
                        .send({ error: "cannot process req", err });
                    }
                    pool1.release();
                    res
                      .status(200)
                      .send({ message: "Todo created successfully" });
                  }
                );
              }
            });
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

// To delete todo only admin access
const handleDeleteUserTodo = (req, res) => {
  try {
    const todoId = req.params.id;

    const token = req.headers.authorization;
    const user_email = req.headers.email;

    // Verify the access token
    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err) {
        return res.status(401).send({ error: "Unauthorized", err });
      } else {
        const dbName = `tenant_${result.org_id}`;
        const userDbConfig = {
          ...dbConfig,
          database: dbName,
        };

        const pool = mysql.createPool(userDbConfig);
        pool.getConnection((error, connection) => {
          if (error) {
            return res
              .status(401)
              .send({ error: "Error while connecting to the database", error });
          }

          // Check if the user exists
          const query = "SELECT * FROM user WHERE email = ?";
          connection.query(query, [user_email], (error, results) => {
            if (error) {
              connection.release();
              return res
                .status(401)
                .send({ error: "Error while executing the query", error });
            }

            if (results.length === 0) {
              connection.release();
              return res.status(404).send({ message: "User not found" });
            }

            const user_id = results[0].id;

            console.log(result.uuid);
            // Delete the todo from the tenant's database
            const deleteTodoQuery =
              "DELETE FROM todo WHERE id = ? AND user_id= ?";
            const deleteTodoValues = [todoId, user_id];
            connection.query(
              deleteTodoQuery,
              deleteTodoValues,
              (err, result) => {
                connection.release();
                if (err) {
                  return res
                    .status(500)
                    .send({ error: "Error while deleting the todo", err });
                }

                if (result.affectedRows === 0) {
                  return res.status(404).send({ message: "Todo not found" });
                }

                console.log(result);
                res.status(200).send({ message: "Todo deleted successfully" });
              }
            );
          });
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

// To update todo only admin access
const handleUpdateUserTodo = (req, res) => {
  try {
    const todoId = req.params.id;
    const { title, description, status } = req.body;
    const token = req.headers.authorization;
    const user_email = req.headers.email;

    // Verify the access token
    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err) {
        return res.status(401).send({ error: "cannot process req", err });
      }

      const dbName = `tenant_${result.org_id}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };
      const pool1 = mysql.createPool(userDbConfig);

      pool1.getConnection((error, connection) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "error while connecting to db", error });
        }

        // Check if the user exists
        const query = "SELECT * FROM user WHERE email = ?";
        connection.query(query, [user_email], (error, results) => {
          if (error) {
            connection.release();
            return res.status(401).send({ error: "cannot process req", error });
          }

          if (results.length === 0) {
            connection.release();
            return res.send({ message: "User not found" });
          }

          const user_id = results[0].id;

          // Update the todo in the tenant's database
          const updateTodoQuery =
            "UPDATE todo SET title = ?, description = ?, status = ? WHERE id = ? AND user_id= ? ";
          const updateTodoValues = [
            title,
            description,
            status,
            todoId,
            user_id,
          ];

          connection.query(updateTodoQuery, updateTodoValues, (err, result) => {
            connection.release();
            if (err) {
              return res.status(401).send({ error: "cannot process req", err });
            }

            if (result.affectedRows === 0) {
              return res.status(404).send({ message: "Todo not found" });
            }

            res.status(200).send({ message: "Todo updated successfully" });
          });
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};


async function getCurrentDateTime() {
  const currentDateTime = new Date(); // Get the current date and time

  const futureDateTime = new Date(
    currentDateTime.getTime() + 24 * 60 * 60 * 1000
  ); // Add 24 hours (24 * 60 * 60 * 1000 milliseconds) to the current date and time

  const options = {
    hour12: false, // Use 24-hour format
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };

  const currentFormatted = currentDateTime.toLocaleString( options);
  const futureFormatted = futureDateTime.toLocaleString( options);

  return {
    current: currentFormatted,
    future: futureFormatted,
  };
}

module.exports = {
  handelAddTodo,
  handleDeleteTodo,
  handleUpdateTodo,
  handleGetAllTodo,
  handleGetTodo,
  handelAddUserTodo,
  handleUpdateUserTodo,
  handleDeleteUserTodo,
};
