import { Typography, Stack, TextField, IconButton } from '@mui/material';
import { useState, useEffect } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface EnterPasswordProps {
  confirm?: boolean;
  enabled?: boolean;
  onPasswordEntered: (password: string) => void;
  children?: JSX.Element;
}

export default function EnterPassword({
  onPasswordEntered,
  confirm = true,
  enabled = true,
  children,
}: EnterPasswordProps) {
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [show, setShow] = useState(false);

  const onPwd1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword1(event.target.value);
  };
  const onPwd2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword2(event.target.value);
  };

  const okay =
    password1.length > 0 && (confirm ? password1 === password2 : true);

  useEffect(() => {
    if (okay) onPasswordEntered(password1);
  }, [password1, password2]);

  const pwd1Error = () => {
    if (password1.length === 0) return 'Must not be empty';
    return null;
  };
  const pwd2Error = () => {
    if (password2.length === 0) return 'Must not be empty';
    if (password2 !== password1) return 'Passwords do not match';
    return null;
  };

  return (
    <>
      <Typography variant="h5" px={2}>
        Password
      </Typography>
      <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
        <TextField
          label="Password"
          id="outlined-code-small"
          value={password1}
          size="small"
          type={show ? 'text' : 'password'}
          onChange={onPwd1Change}
          InputProps={{ readOnly: !enabled }}
          error={!okay}
          helperText={pwd1Error()}
        />
        {confirm && (
          <TextField
            label="Confirmation"
            id="outlined-code-small"
            value={password2}
            size="small"
            type={show ? 'text' : 'password'}
            onChange={onPwd2Change}
            InputProps={{ readOnly: !enabled }}
            error={!okay}
            helperText={pwd2Error()}
          />
        )}
        <IconButton
          size="small"
          disabled={!enabled}
          onClick={() => setShow(!show)}
        >
          {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
        <>{children}</>
      </Stack>
    </>
  );
}
