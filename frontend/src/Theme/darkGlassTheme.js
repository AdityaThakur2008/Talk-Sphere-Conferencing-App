// darkGlassTheme.js
import { createTheme } from "@mui/material/styles";

const darkGlassTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#60a5fa", // Neon Blue
    },
    secondary: {
      main: "#ff9839", // Neon Orange
    },
    background: {
      default: "#0b0b12",
      paper: "rgba(20, 20, 30, 0.45)",
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#cbd5e1",
    },
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 0 25px rgba(96,165,250,0.15)",
          borderRadius: "16px",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "10px",
          fontWeight: 600,
          "&.MuiButton-contained": {
            background: "linear-gradient(90deg, #2563eb, #ff9839)",
            boxShadow: "0 0 25px rgba(37,99,235,0.4)",
            transition: "0.3s ease",
            "&:hover": {
              boxShadow: "0 0 35px rgba(255,152,57,0.6)",
              transform: "translateY(-2px)",
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& label": { color: "#cbd5e1" },
          "& .MuiOutlinedInput-root": {
            borderRadius: "10px",
            "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
            "&:hover fieldset": { borderColor: "#60a5fa" },
            "&.Mui-focused fieldset": { borderColor: "#ff9839" },
          },
        },
      },
    },
  },
});

export default darkGlassTheme;
