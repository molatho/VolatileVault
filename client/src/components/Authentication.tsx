import { useEffect, useState } from 'react';
import Api, { ApiResponse } from '../utils/Api';
import { snackError, snackInfo, snackSuccess } from '../utils/Snack';
import {
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

interface AuthenticationProps {
  api: Api;
  onAuthenticated: (token: string) => void;
}

export default function Authentication({
  api,
  onAuthenticated,
}: AuthenticationProps) {
  const [totp, setTotp] = useState('');
  const [totpEditAvailable, setTotpEditAvailable] = useState(true);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const [authenticated, setAuthenticated] = useState<boolean | undefined>(
    undefined
  );
  const [saveToken, setSaveToken] = useState<boolean>(false);

  useEffect(() => {
    async function checkAuth() {
      const token = api.getToken();
      try {
        const res = await api.isAuthenticated();
        setAuthenticated(res.success);
        if (token === null) snackSuccess('Authentication successful');
        onAuthenticated(token as string);
      } catch (err) {
        if (token !== null) {
          api.clearToken();
          snackError('Token expired or invalid; you need to re-authenticate.');
        } else {
          snackInfo('You need to authenticate');
        }
        setAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const onTotpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTotp(event.target.value);
  };

  useEffect(() => {
    async function authenticate() {
      if (totp.length !== 6) return;
      setLastError(undefined);
      setTotpEditAvailable(false);
      try {
        const auth = await api.authenticate(totp);
        setAuthenticated(auth.success);
        setLastError(auth.success ? undefined : auth.message);
        snackSuccess('Authentication successful');
        if (saveToken) api.saveToken();
        onAuthenticated(auth.token as string);
      } catch (error) {
        const err = error as ApiResponse;
        setLastError(err.message);
        setTimeout(() => {
          setLastError(undefined);
          setTotpEditAvailable(true);
          setTotp('');
        }, 1000);
        snackError(err.message);
      }
    }
    authenticate();
  }, [totp]);

  return (
    <>
      {authenticated === undefined && (
        <Typography variant="body2" color="text.secondary">
          Validating authentication...
        </Typography>
      )}
      {authenticated === false && (
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
          <FormControlLabel
            control={
              <Checkbox
                checked={saveToken}
                onChange={(ev) => setSaveToken(ev.target.checked)}
              />
            }
            label="Save token in localStorage"
          />
        </Stack>
      )}
    </>
  );
}
