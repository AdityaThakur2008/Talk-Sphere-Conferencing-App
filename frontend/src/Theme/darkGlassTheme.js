import { createTheme } from "@mui/material/styles";

const darkGlassTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#5b8cff",
    },
    secondary: {
      main: "#8da6ff",
    },
    background: {
      default: "#06070b",
      paper: "#151923",
    },
    text: {
      primary: "#f6f7fb",
      secondary: "#8f96a8",
    },
    divider: "rgba(255,255,255,0.08)",
  },
  typography: {
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    body1: { fontSize: "0.95rem", lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.24)",
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
          minHeight: "44px",
          transition:
            "background-color 180ms ease, transform 180ms ease, box-shadow 180ms ease",
          "&.MuiButton-contained": {
            backgroundColor: "#5b8cff",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#7aa2ff",
              transform: "translateY(-1px)",
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& label": { color: "#8f96a8" },
          "& .MuiOutlinedInput-root": {
            borderRadius: "10px",
            backgroundColor: "rgba(255,255,255,0.03)",
            "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&.Mui-focused fieldset": { borderColor: "#5b8cff" },
          },
        },
      },
    },
  },
});

export default darkGlassTheme;
