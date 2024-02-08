import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Typography,
  useTheme,
  Button,
  Fab,
  Stepper,
  Step,
  StepLabel,
  Grid,
  ButtonGroup,
  Box,
  Stack,
  TextField,
  LinearProgress,
} from '@mui/material';
import React, { createRef, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import bytes from 'bytes';
import { BlobReader, ZipWriter, Uint8ArrayWriter } from '@zip.js/zip.js';

interface FileSelectionProps {
  onFilesSelected: (files: File[]) => void;
}

function FileSelection({ onFilesSelected }: FileSelectionProps) {
  const baseStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '20px',
    borderWidth: 2,
    borderRadius: 8,
    borderColor: '#bbb',
    borderStyle: 'dashed',
    color: '#bdbdbd',
    outline: 'none',
    transition: 'border .24s ease-in-out',
    margin: '20px',
  };

  const focusedStyle = {
    borderColor: '#2196f3',
  };

  const acceptStyle = {
    borderColor: '#00e676',
  };

  const rejectStyle = {
    borderColor: '#ff1744',
  };

  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  const {
    acceptedFiles,
    getRootProps,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject,
  } = useDropzone();

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isFocused ? focusedStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {}),
    }),
    [isFocused, isDragAccept, isDragReject]
  );

  const summaryRef = createRef<HTMLTableRowElement>();

  useEffect(() => {
    setSelectedFiles(selectedFiles.concat(acceptedFiles));
  }, [acceptedFiles]);

  useEffect(
    () => summaryRef?.current?.scrollIntoView({ behavior: 'smooth' }),
    [selectedFiles]
  );

  const handleRemove = (file: File) => {
    setSelectedFiles(selectedFiles.filter((f) => f != file));
  };

  const fileRows = selectedFiles.map((file) => (
    <TableRow
      key={file.name}
      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
    >
      <TableCell component="th" scope="row">
        {file.name}
      </TableCell>
      <TableCell align="right">
        {bytes.format(file.size, { decimalPlaces: 2 })}
      </TableCell>
      <TableCell align="center">
        <IconButton
          aria-label="delete"
          size="small"
          onClick={() => handleRemove(file)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  ));

  const theme = useTheme();

  // Add Ref for scrolling
  fileRows.push(<tr key="ref" ref={summaryRef}></tr>);

  return (
    <>
      <h4>Files</h4>
      <div {...getRootProps({ style })}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop some files here, or click to select files</p>
      </div>
      <TableContainer component={Paper} sx={{ maxHeight: '300px' }}>
        <Table aria-label="simple table" size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">
                Size
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{selectedFiles && fileRows}</TableBody>
        </Table>
      </TableContainer>
      <Grid container spacing={2} sx={{ p: 2 }}>
        <Grid item xs={4}>
          <Typography>{`Total: ${selectedFiles.length} files`}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography>
            {bytes.format(
              selectedFiles.reduce((n, file) => n + file.size, 0),
              { decimalPlaces: 2 }
            )}
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <Box display="flex" justifyContent="flex-end">
            <ButtonGroup variant="contained">
              <Button
                onClick={() => setSelectedFiles([])}
                size="small"
                color="error"
                disabled={selectedFiles.length < 1}
              >
                <DeleteIcon />
              </Button>
              <Button
                onClick={() => onFilesSelected(selectedFiles)}
                size="small"
                color="success"
                disabled={selectedFiles.length < 1}
              >
                <CheckIcon />
              </Button>
            </ButtonGroup>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

interface EnterPasswordProps {
  onPasswordEntered: (password: string) => void;
}

function EnterPassword({ onPasswordEntered }: EnterPasswordProps) {
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');

  const onPwd1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword1(event.target.value);
  };
  const onPwd2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword2(event.target.value);
  };

  const okay = password1.length > 0 && password1 == password2;

  return (
    <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
      <TextField
        label="Password"
        id="outlined-code-small"
        value={password1}
        size="small"
        type="password"
        onChange={onPwd1Change}
        error={!okay}
      />
      <TextField
        label="Confirmation"
        id="outlined-code-small"
        value={password2}
        size="small"
        type="password"
        onChange={onPwd2Change}
        error={!okay}
      />
      <Box display="flex" justifyContent="flex-end">
        <Button
          onClick={() => onPasswordEntered(password1)}
          size="small"
          color="success"
          variant="contained"
          disabled={!okay}
        >
          <CheckIcon />
        </Button>
      </Box>
    </Stack>
  );
}

interface CompressorProps {
  files: File[];
  password: string;
  onFinished: (blob: Buffer) => void;
}

function Compressor({ files, password, onFinished }: CompressorProps) {
  //TODO: Replace with jszip?
  const [progress, setProgress] = useState<number[]>(files.map((f) => 0));
  const [max, setMax] = useState<number[]>(files.map((f) => 0));
  const [zipFile, setZipFile] = useState(
    new ZipWriter(new Uint8ArrayWriter(), {
      bufferedWrite: true,
      level: 9,
      password: password,
    })
  );

  const percentages =
    max.length > 0
      ? (progress.reduce(
          (progressSum, currentProgress, idx) =>
            progressSum + (max[idx] ? currentProgress / max[idx] : 0),
          0
        ) /
          max.length) *
        100
      : 0;

  useEffect(() => {
    Promise.all(
      files.map(async (file, fidx) => {
        await zipFile.add(file.name, new BlobReader(file), {
          password: password,
          onstart: (smax) => {
            setMax(max.map((m, i) => (i == fidx ? smax : m)));
            return Promise.resolve();
          },
          onprogress: (pidx, pmax) => {
            setMax(max.map((m, i) => (i == fidx ? pmax : m)));
            setProgress(progress.map((p, i) => (i == fidx ? pidx : p)));
            return Promise.resolve();
          },
        });
      })
    )
      .then(async () => {
        var blob = await zipFile.close();
        onFinished(Buffer.from(blob));
      })
      .catch(console.error);
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress variant="determinate" value={percentages} />
    </Box>
  );
}

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(0);

  const steps = ['Files', 'Password', 'Compress', 'Encrypt', 'Upload'];

  const getCurrentStepView = () => {
    switch (step) {
      case 0:
        return (
          <FileSelection
            onFilesSelected={(_files) => {
              setFiles(_files);
              setStep(1);
            }}
          />
        );
      case 1:
        return (
          <EnterPassword
            onPasswordEntered={(_password) => {
              setPassword(_password);
              setStep(2);
            }}
          />
        );
      case 2:
        return (
          <Compressor
            files={files}
            password={password}
            onFinished={(blob) => console.log(blob)}
          />
        );
      case 3:
        return <div>noice</div>;
    }
  };

  return (
    <>
      <Stepper activeStep={step} sx={{ width: '100%', my: 4 }}>
        {steps.map((label, index) => {
          const stepProps: { completed?: boolean } = {};
          const labelProps: {
            optional?: React.ReactNode;
          } = {};
          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {getCurrentStepView()}
    </>
  );
}
