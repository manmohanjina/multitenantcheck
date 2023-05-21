const express = require("express");
const {
  addUser,
  deleteUser,
  updateUser,
  getUser,
  userLogin,
  handleGetAllUser,
 
  handleAssignToColleague,
  handelgetAlluser1,
} = require("../RouterController/userController");
const { validateAdmin } = require("../middleware/validateadmin");

const usersRoute = express.Router();
require("dotenv").config();
usersRoute.patch("/assignto/:id", handleAssignToColleague);
usersRoute.post("/login", userLogin);

usersRoute.get('/usertouser',handelgetAlluser1)
//below are routes which needs admin verification;
usersRoute.use("/", validateAdmin);
usersRoute.post("/adduser", addUser);
usersRoute.get("/getuser/:id", getUser);
usersRoute.patch("/updateuser/:id", updateUser);
usersRoute.delete("/deleteuser/:id", deleteUser);
usersRoute.get("/alluser", handleGetAllUser);

module.exports = {
  usersRoute,
};
