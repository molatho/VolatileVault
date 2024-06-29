import { Lock } from '@mui/icons-material';
import {
  CssBaseline,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Stepper,
  StepLabel,
  Step,
  StepContent,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import Api, { ApiConfigResponse, ApiResponse } from '../utils/Api';
import Authentication from './Authentication';
import { snackError } from '../utils/Snack';
import ModeSelector, { SelectedMode } from './ModeSelector';
import { ExfilExtension } from './extensions/Extension';
import { initializeExfilExtensions } from './extensions/ExtensionManager';
import BasicSelector from './BasicSelector';

export default function Main() {
  const [api, _] = useState(new Api());
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [config, setConfig] = useState<ApiConfigResponse | undefined>(
    undefined
  );
  const [tabIdx, setTabIdx] = useState(0);
  const [mode, setMode] = useState<SelectedMode>('None');
  const [exfils, setExfils] = useState<ExfilExtension[]>([]);
  const [selectedExfil, setSelectedExfil] = useState<ExfilExtension | null>(
    null
  );
  const [step, setStep] = useState(0);

  useEffect(() => {
    async function getConfig() {
      try {
        const res = await api.config();
        setConfig(res);
      } catch (error) {
        const err = error as ApiResponse;
        snackError(`Failed querying config: ${err.message}`);
        setAuthenticated(false);
      }
    }
    if (authenticated) getConfig();
  }, [authenticated]);

  useEffect(() => {
    if (!config) return;
    setExfils(
      initializeExfilExtensions(api, config).filter((e) => e.isPresent())
    );
  }, [config]);

  function onModeSelected(type: SelectedMode, exfils: ExfilExtension[]): void {
    setMode(type);
    setExfils(exfils);
  }

  function onExfilSelected(idx: number): void {
    setSelectedExfil(exfils[idx]);
  }

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

          {authenticated === false && (
            <CardContent>
              <Authentication
                api={api}
                onAuthenticated={(_) => setAuthenticated(true)}
              />
            </CardContent>
          )}

          {config && (
            <Stepper activeStep={step} orientation="vertical">
              <Step key={0}>
                <StepLabel>{authenticated ? 'Authenticated!' : 'Authentication'}</StepLabel>
                <StepContent>lul</StepContent>
              </Step>
              <Step key={1}>
                <StepLabel>What would you like to do?</StepLabel>
                <StepContent>lul</StepContent>
              </Step>
              <Step key={2}>
                <StepLabel>Select exfiltration transport</StepLabel>
                <StepContent>lul</StepContent>
              </Step>
              <Step key={3}>
                <StepLabel>Select storage</StepLabel>
                <StepContent>lul</StepContent>
              </Step>
            </Stepper>
          )}

          {config && mode == 'None' && (
            <CardContent>
              <Typography gutterBottom variant="h6" component="div">
                What would you like to do?
              </Typography>
              <ModeSelector exfils={exfils} onSelected={onModeSelected} />
              {/*tabIdx >= 0 && tabIdx < tabs.length ? tabs[]*/}
            </CardContent>
          )}

          {mode != 'None' && exfils && selectedExfil === null && (
            <CardContent>
              <BasicSelector
                items={exfils}
                type="Exfil"
                onSelected={onExfilSelected}
              />
            </CardContent>
          )}
        </Card>
      </Container>
    </React.Fragment>
  );
}
