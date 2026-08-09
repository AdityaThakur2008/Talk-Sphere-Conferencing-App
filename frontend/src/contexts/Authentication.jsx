import { Children, createContext, useContext, useState } from "react";
import axios from "axios";
import { Password } from "@mui/icons-material";
import httpStatus from "http-status";
import { useNavigate } from "react-router-dom";
import Server_Dev from "../enviroment";

export const AuthContext = createContext();

const client = axios.create({
  baseURL: `${Server_Dev}/user`,
});

export const AuthProvider = ({ children }) => {
  const authContext = useContext(AuthContext);

  const [userData, SetUserData] = useState(authContext);

  const handleRegister = async (name, username, password) => {
    try {
      let response = await client.post("/register", {
        name: name,
        password: password,
        username: username,
      });
      console.log(response);

      if (response.status == httpStatus.OK) {
        return response.data.message;
      }
      if (response.status == httpStatus.FOUND) {
        return response.data.message;
      }
    } catch (error) {
      throw error;
    }
  };
  const handleLogin = async (username, password) => {
    try {
      let request = await client.post("/login", {
        username: username,
        password: password,
      });

      if (request.status == httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        router("/home");
      }
    } catch (error) {
      throw error;
    }
  };

  const getUserHistory = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return request.data;
    } catch (error) {
      throw error;
    }
  };
  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post(
        "/add_to_activity",
        {
          meeting_Code: meetingCode,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return request.status;
    } catch (error) {
      throw error;
    }
  };

  const router = useNavigate();

  const data = {
    userData,
    SetUserData,
    handleRegister,
    handleLogin,
    addToUserHistory,
    getUserHistory,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
