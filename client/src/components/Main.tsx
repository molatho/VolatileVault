import { Lock } from '@mui/icons-material';
import {
  CssBaseline,
  Typography,
  Container,
  Button,
  Card,
  CardContent,
  CardMedia,
  Stack,
  TextField,
  Tab,
  Tabs,
} from '@mui/material';
import React from 'react';
import Api, { ApiConfigResponse, ApiResponse } from '../utils/Api';
import Upload from './Upload';
import Download from './Download';
import { enqueueSnackbar } from 'notistack';

export default function Main() {
  const [api, setApi] = React.useState(new Api());
  const [authenticated, setAuthenticated] = React.useState<boolean | undefined>(
    undefined
  );
  const [totp, setTotp] = React.useState('');
  const [totpEditAvailable, setTotpEditAvailable] = React.useState(true);
  const [lastError, setLastError] = React.useState<string | undefined>(
    undefined
  );
  const [tabIdx, setTabIdx] = React.useState(0);

  React.useEffect(() => {
    api
      .isAuthenticated()
      .then((res) => setAuthenticated(res.success))
      .catch((err) => {
        enqueueSnackbar({
          message: 'You need to authenticate',
          variant: 'info',
        });
        setAuthenticated(false);
      });
  }, []);

  const onTotpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTotp(event.target.value);
  };

  const onAuthenticate = () => {
    setLastError(undefined);
    setTotpEditAvailable(false);
    api
      .authenticate(totp)
      .then((res) => {
        setAuthenticated(res.success);
        setLastError(res.success ? undefined : res.message);
        enqueueSnackbar({
          message: 'Authentication successful',
          variant: 'success',
        });
      })
      .catch((err: ApiResponse) => {
        setLastError(err.message);
        setTimeout(() => {
          setLastError(undefined);
          setTotpEditAvailable(true);
          setTotp('');
        }, 1000)
        enqueueSnackbar({ message: err.message, variant: 'error' });
      })
  };

  return (
    <React.Fragment>
      <CssBaseline />
      <Container component="main" maxWidth="md" sx={{ mb: 4, mt: 4 }}>
        <Card sx={{ maxWidth: 1600 }}>
          <CardMedia sx={{ height: 200 }} image="vault.png" />
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Lock color="primary" />
              <Typography gutterBottom variant="h5" component="div">
                Volatile Vault
              </Typography>
            </Stack>
          </CardContent>
          {authenticated === undefined && (
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Validating authentication...
              </Typography>
            </CardContent>
          )}
          {authenticated === false && (
            <>
              <CardContent>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Code"
                    id="outlined-code-small"
                    value={totp}
                    size="small"
                    InputProps={{ readOnly: !totpEditAvailable }}
                    inputProps={{ maxLength: 6 }}
                    onChange={onTotpChange}
                    error={lastError !== undefined}
                  />
                  <Button
                    variant="contained"
                    disabled={!totpEditAvailable || totp.length != 6}
                    onClick={onAuthenticate}
                  >
                    Authenticate
                  </Button>
                </Stack>
              </CardContent>
            </>
          )}
          {authenticated === true && (
            <CardContent>
              <Tabs
                value={tabIdx}
                onChange={(_, idx) => setTabIdx(idx)}
                aria-label="basic tabs example"
              >
                <Tab label="Upload" />
                <Tab label="Download" />
              </Tabs>
              {tabIdx == 0 && <Upload api={api}/>}
              {tabIdx == 1 && <Download api={api} />}
            </CardContent>
          )}
        </Card>
      </Container>
    </React.Fragment>
  );
}
