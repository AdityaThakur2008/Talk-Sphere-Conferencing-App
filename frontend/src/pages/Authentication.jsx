import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";

import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { useNavigate } from "react-router-dom";

import darkGlassTheme from "../Theme/darkGlassTheme.js";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/Authentication";
import { Snackbar } from "@mui/material";

// TODO remove, this demo shouldn't need to reset the theme.

const defaultTheme = createTheme();

export default function Authentication() {
  const navigate = useNavigate();
  const [fullname, SetFullname] = React.useState();
  const [password, SetPassword] = React.useState();
  const [userName, SetUserName] = React.useState();
  const [error, SetError] = React.useState();
  const [message, SetMessage] = React.useState();
  const [formState, SetFormState] = React.useState(0);
  const [open, SetOpen] = React.useState(false);

  const { handleLogin, handleRegister } = React.useContext(AuthContext);

  let handleAuth = async () => {
    try {
      if (formState === 0) {
        let result = await handleLogin(userName, password);
        navigate("/home");
        SetMessage(result);
        SetOpen(true);
        SetError();
        SetPassword("");
        SetUserName("");
      }
      if (formState === 1) {
        let result = await handleRegister(fullname, userName, password);

        console.log(result);
        SetMessage(result);
        SetOpen(true);
        SetError();
        SetFormState(0);
        SetPassword("");
        SetUserName("");
        await handleLogin(userName, password);
      }
    } catch (error) {
      let message = error.response.data.message;
      SetError(message);
    }
  };

  return (
    <ThemeProvider theme={darkGlassTheme}>
      <CssBaseline />
      <Grid
        container
        sx={{
          height: "100vh",
          background:
            "radial-gradient(circle at top left, #0a0a0f, #050505 70%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
        <Grid
          item
          xs={11}
          sm={8}
          md={5}
          component={Paper}
          elevation={12}
          sx={{
            background: "rgba(20,20,30,0.55)",
            backdropFilter: "blur(16px)",
            borderRadius: "20px",
            p: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
          <Avatar
            sx={{
              m: 1,
              bgcolor: "secondary.main",
              boxShadow: "0 0 15px rgba(255,152,57,0.4)",
            }}>
            <LockOutlinedIcon />
          </Avatar>

          <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
            <Button
              variant={formState === 0 ? "contained" : "text"}
              onClick={() => SetFormState(0)}>
              Login
            </Button>
            <Button
              variant={formState === 1 ? "contained" : "text"}
              onClick={() => SetFormState(1)}>
              Sign Up
            </Button>
          </Stack>

          <Box component="form" noValidate sx={{ mt: 1, width: "100%" }}>
            {formState === 1 && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full name"
                name="name"
                value={fullname}
                onChange={(e) => SetFullname(e.target.value)}
              />
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              value={userName}
              onChange={(e) => SetUserName(e.target.value)}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              value={password}
              onChange={(e) => SetPassword(e.target.value)}
            />

            <p style={{ color: "red", textAlign: "center" }}>{error}</p>

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleAuth}>
              {formState === 0 ? "Login" : "Register"}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        message={message}
        onClose={() => SetOpen(false)}
      />
    </ThemeProvider>
  );
}
