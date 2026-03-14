import React from "react";
import WithAuth from "../utils/WithAuth";
import { useNavigate } from 'react-router-dom'
import "../styles/Home.css";
import { IconButton } from "@mui/material";
import { AccessTime, Logout } from "@mui/icons-material";
import { AuthContext } from "../contexts/Authentication.jsx";


function Home() {
  let navigate = useNavigate();
  const  [MeetingCode , setMeetingCode] = React.useState("");
  const {addToUserHistory} = React.useContext(AuthContext);
  let handleJoinCall = async () => {
    await addToUserHistory(MeetingCode);
    navigate(`/${MeetingCode}`);
  }   


  return (
    <>
      <div className="Home-Main">
        <div className="Navbar">
          <div className="logo">Talk Sphere</div>

          <div className="nav-links">
            <div className="nav-item" onClick={() => {navigate("/History")}}>
              <IconButton className="btn-icon">
                <AccessTime />
              </IconButton>
              <span>History</span>
            </div>

            <div className="nav-item" onClick={() => {localStorage.removeItem("token"); navigate("/")}}>
              <IconButton className="btn-icon">
                <Logout />
              </IconButton>
              <span>Logout</span>
            </div>
          </div>
        </div>

        <div className="Meet-Container">
          <div className="Left-Conatiner">
            <div>
              <h2>Providing Quality Video Call Just Like Quality Education</h2>
              <div>
                <input type="text" placeholder="Enter meeting code..."  value={MeetingCode} onChange={e => {setMeetingCode(e.target.value)}}/>
                <button onClick={handleJoinCall}>Join</button>
              </div>
            </div>
          </div>
          <div className="Right-Container">
           <div className="video-frame">
  <div className="user-circle"></div>
  <div className="user-circle"></div>
  <div className="user-circle"></div>
  <p>Connecting to call...</p>
</div>

          </div>
        </div>
      </div>
    </>
  );
}

export default WithAuth(Home);
