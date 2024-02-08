import React from 'react';
import Main from './components/Main';
import { createTheme, CssBaseline } from '@mui/material';
import { ThemeProvider } from 'styled-components';
import { SnackbarProvider } from 'notistack';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider preventDuplicate={true} />
      <CssBaseline />
      <Main />
    </ThemeProvider>
  );
}

export default App;
