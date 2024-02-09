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
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import React, { createRef, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import bytes from 'bytes';
import jszip from 'jszip';
import { encryptSymmetric } from '../utils/Crypto';
import Api, { ApiConfigResponse } from '../utils/Api';
import { enqueueSnackbar } from 'notistack';
import moment from 'moment';

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

  useEffect(() => {
    summaryRef?.current?.scrollIntoView({ behavior: 'smooth' });
    onFilesSelected(selectedFiles);
  }, [selectedFiles]);

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
      <Typography variant="h5" px={2}>
        Files
      </Typography>
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
            {bytes.format(calcFileSize(selectedFiles), { decimalPlaces: 2 })}
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              onClick={() => setSelectedFiles([])}
              size="small"
              color="error"
              disabled={selectedFiles.length < 1}
            >
              <DeleteIcon />
            </Button>
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
  const [password1, setPassword1] = useState('123');
  const [password2, setPassword2] = useState('123');
  const [show, setShow] = useState(false);

  const onPwd1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword1(event.target.value);
  };
  const onPwd2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword2(event.target.value);
  };

  const okay = password1.length > 0 && password1 == password2;

  useEffect(() => {
    if (okay) onPasswordEntered(password1);
  }, [password1, password2]);

  const pwd1Error = () => {
    if (password1.length == 0) return 'Must not be empty';
    return null;
  };
  const pwd2Error = () => {
    if (password2.length == 0) return 'Must not be empty';
    if (password2 != password1) return 'Passwords do not match';
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
          error={!okay}
          helperText={pwd1Error()}
        />
        <TextField
          label="Confirmation"
          id="outlined-code-small"
          value={password2}
          size="small"
          type={show ? 'text' : 'password'}
          onChange={onPwd2Change}
          error={!okay}
          helperText={pwd2Error()}
        />
        <IconButton size="small" onClick={() => setShow(!show)}>
          {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </Stack>
    </>
  );
}

function calcFileSize(files: File[]): number {
  return files.reduce((n, file) => n + file.size, 0);
}

interface DataInputProps {
  onFinished: (files: File[], password: string) => void;
  maxFileSize?: number;
}

function DataInput({ onFinished, maxFileSize }: DataInputProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');

  const size = calcFileSize(files);

  return (
    <Stack direction="column" spacing={2}>
      <FileSelection onFilesSelected={setFiles} />
      <EnterPassword onPasswordEntered={setPassword} />
      {maxFileSize && calcFileSize(files) > maxFileSize && (
        <Alert severity="warning">
          <AlertTitle>Maximum file size </AlertTitle>A maximum of{' '}
          {bytes.format(maxFileSize, { decimalPlaces: 2 })} can be uploaded.
          While the selected files will be compressed in the next step, you may
          want to consider selecting fewer files for this upload.
        </Alert>
      )}
      <Box display="flex" justifyContent="flex-end">
        <Button
          onClick={() => onFinished(files, password)}
          size="small"
          color="success"
          variant="contained"
          disabled={files.length < 1 || !password}
          endIcon={<CheckIcon />}
        >
          Confirm
        </Button>
      </Box>
    </Stack>
  );
}

interface UploadInfo {
  id: string;
  lifeTime: number;
}

interface ProcessUploadProps {
  files: File[];
  password: string;
  api: Api;
  onFinished: (info: UploadInfo) => void;
  maxFileSize?: number;
}

function ProcessUpload({
  files,
  password,
  api,
  onFinished,
  maxFileSize,
}: ProcessUploadProps) {
  interface LogEntry {
    timestamp: Date;
    category: string;
    content: string;
    variant: 'error' | 'success' | undefined;
  }

  var [entries, setEntries] = useState<LogEntry[]>([]);

  const [encData, setEncData] = useState<ArrayBuffer | null>(null);
  const [encIv, setEncIv] = useState<ArrayBuffer | null>(null);

  const summaryRef = createRef<HTMLTableRowElement>();

  const addEntry = (
    category: string,
    content: string,
    variant?: 'error' | 'success'
  ) => {
    entries = [
      ...entries,
      {
        timestamp: new Date(Date.now()),
        category: category,
        content: content,
        variant: variant,
      },
    ];
    setEntries(entries);
  };

  useEffect(
    () => summaryRef.current?.scrollIntoView({ behavior: 'smooth' }),
    [entries]
  );

  useEffect(() => {
    const zipFile = jszip();
    addEntry('Compression', 'Starting...');
    Promise.all(
      files.map(async (file) => {
        const data = await file.arrayBuffer();
        zipFile.file(file.name, data, { date: new Date(file.lastModified) });
      })
    )
      .then(async () => {
        var lastFile = '';
        var blob = await zipFile.generateAsync(
          {
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 },
          },
          (meta) => {
            if (meta.currentFile && lastFile != meta.currentFile) {
              addEntry(
                'Compression',
                `Processing "${meta.currentFile}" (${meta.percent.toFixed(
                  Math.max(0, files.length.toString().length - 3)
                )}%)`
              );
              lastFile = meta.currentFile;
            }
          }
        );
        addEntry(
          'Compression',
          `Done: ${bytes.format(calcFileSize(files), {
            decimalPlaces: 2,
          })} -> ${bytes.format(blob.byteLength, { decimalPlaces: 2 })}`,
          'success'
        );
        return blob;
      })
      .then((blob) => {
        addEntry('Encryption', 'Starting...');
        return encryptSymmetric(blob, password);
      })
      .then(([cipher, iv]) => {
        addEntry(
          'Encryption',
          `Done: ${bytes.format(cipher.byteLength, { decimalPlaces: 2 })}`,
          'success'
        );
        setEncData(cipher);
        setEncIv(iv);
      })
      .catch((err) => {
        enqueueSnackbar({
          message: `Processing failed: ${err?.message ?? JSON.stringify(err)}`,
          variant: 'error',
        });
        addEntry('ERROR', err?.message ?? JSON.stringify(err), 'error');
      });
  }, []);

  useEffect(() => {
    if (!encData || !encIv) return;
    const data = encData as ArrayBuffer;
    const iv = encIv as ArrayBuffer;
    var tmp = new Uint8Array(data.byteLength + iv.byteLength);
    tmp.set(new Uint8Array(data), 0);
    tmp.set(new Uint8Array(iv), data.byteLength);

    if (maxFileSize && tmp.byteLength > maxFileSize) {
      addEntry(
        'ERROR',
        `File size ${bytes.format(tmp.byteLength, {
          decimalPlaces: 2,
        })} exceeds the allowed maximum of ${bytes.format(maxFileSize, {
          decimalPlaces: 2,
        })}; aborting.`,
        'error'
      );
      return;
    }

    addEntry('Upload', 'Starting...');
    api
      .upload(tmp)
      .then((res) => {
        addEntry('Upload', 'Done!', 'success');
        enqueueSnackbar({
          message: 'Upload finished!',
          variant: 'success',
        });
        onFinished({
          id: res.id as string,
          lifeTime: res.lifeTime as number,
        });
      })
      .catch((err) => {
        enqueueSnackbar({
          message: `Upload failed: ${err?.message ?? JSON.stringify(err)}`,
          variant: 'error',
        });
        addEntry('ERROR', err?.message ?? JSON.stringify(err), 'error');
      });
  }, [encData, encIv]);

  const theme = useTheme();

  const createRow = (entry: LogEntry, idx: number) => {
    const backgroundColor = entry.variant
      ? entry.variant == 'success'
        ? theme.palette.success.main
        : theme.palette.error.main
      : undefined;
    const color = entry.variant
      ? theme.palette.getContrastText(backgroundColor as string)
      : theme.palette.text.primary;
    return (
      <TableRow key={idx}>
        <TableCell sx={{ backgroundColor, color }}>
          {entry.timestamp.toISOString().split('T')[1].split('.')[0]}
        </TableCell>
        <TableCell sx={{ backgroundColor, color }}>{entry.category}</TableCell>
        <TableCell sx={{ backgroundColor, color }}>{entry.content}</TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ maxHeight: '300px' }}>
        <Table aria-label="simple table" size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Output</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(createRow)}
            <tr key="ref" ref={summaryRef}></tr>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

interface UploadInfoElementProps {
  info: UploadInfo;
}

function UploadInfoElement({ info }: UploadInfoElementProps) {
  const [remaining, setRemaining] = useState('00:00:00');
  const [ownNowDate, setOwnNowDate] = useState(moment());

  useEffect(() => {
    const timer = setInterval(() => {
      const ownExpiryDate = moment(ownNowDate).add(info.lifeTime, 's');
      const timeLeft = moment.duration(ownExpiryDate.diff(moment()));
      setRemaining(moment.utc(timeLeft.asMilliseconds()).format('HH:mm:ss'));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Box display="flex" justifyContent="center" mt={4}>
        <Alert severity="success">
          <AlertTitle>Files successfully uploaded!</AlertTitle>
          Your download ID is <b>{info.id}</b>. Please note it down as it won't
          be shown to you again.
          <br />
          The uploaded data will be removed in {remaining} without any futher
          notice.
        </Alert>
      </Box>
    </>
  );
}

interface UploadProps {
  api: Api;
}

export default function Upload({ api }: UploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(0);
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null);
  const [config, setConfig] = React.useState<ApiConfigResponse | null>(null);

  const steps = ['Data Input', 'Process & Upload', 'Done'];

  useEffect(() => {
    api
      .config()
      .then((res) => setConfig(res))
      .catch((err) =>
        enqueueSnackbar({
          message: `Failed to get config: ${
            err?.message ?? JSON.stringify(err)
          }`,
          variant: 'error',
        })
      );
  }, []);

  const getCurrentStepView = () => {
    switch (step) {
      case 0:
        return (
          <DataInput
            onFinished={(_files, _password) => {
              setFiles(_files);
              setPassword(_password);
              setStep(1);
            }}
            maxFileSize={config?.fileSize}
          />
        );
      case 1:
      case 2:
        return (
          <>
            <ProcessUpload
              files={files}
              password={password}
              api={api}
              onFinished={(info) => {
                setUploadInfo(info);
                setStep(2);
              }}
              maxFileSize={config?.fileSize}
            />
            {step == 2 && uploadInfo != null && (
              <UploadInfoElement info={uploadInfo} />
            )}
          </>
        );
      default:
        return <></>;
    }
  };

  return (
    <>
      <Stepper activeStep={step} sx={{ width: '100%', my: 4, px: 2 }}>
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
