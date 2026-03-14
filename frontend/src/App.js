import logo from "./logo.svg";
import "./App.css";
import Landing from "./pages/Landing.jsx";
import Authentication from "./pages/Authentication.jsx";
import { AuthProvider } from "./contexts/Authentication.jsx";

import History from "./pages/history.jsx";

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import VideoMeetComponent from "./pages/VideoMeet.jsx";
import Home from "./pages/Home.jsx";

function App() {
  return (
    <>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Authentication />} />
            <Route path="/home" element={<Home />} />
            <Route path="/History" element={<History />} />
            <Route path="/:url" element={<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;
