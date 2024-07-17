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
  Stepper,
  Step,
  StepLabel,
  Grid,
  Box,
  Stack,
  Alert,
  AlertTitle,
} from '@mui/material';
import React, { createRef, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import jszip from 'jszip';
import { encryptSymmetric } from '../../utils/Crypto';
import { enqueueSnackbar } from 'notistack';
import moment from 'moment';
import EnterPassword from '../EnterPassword';
import { calcSize, formatSize } from '../../utils/Files';
import { fromArrayBuffer } from '../../utils/Entropy';
import { ExfilExtension, StorageExtension } from '../extensions/Extension';
import EventTable, { createLogEntry, EventEntry } from './EventTable';
import { SelectedMode } from '../ModeSelector';

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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [entropies, setEntropies] = useState<{ [key: string]: number }>({});

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
    // Remove duplicates
    setSelectedFiles(
      selectedFiles
        .concat(acceptedFiles)
        .filter(
          (f, i, a) =>
            i == a.length - 1 ||
            a.slice(i + 1).findIndex((_f) => _f.name == f.name) === -1
        )
    );
  }, [acceptedFiles]);

  useEffect(() => {
    const updateEntropies = async () => {
      const res = await Promise.all(
        selectedFiles.map(async (file) => {
          if (Object.keys(entropies).findIndex((k) => k == file.name) === -1) {
            const data = await file.arrayBuffer();
            entropies[file.name] = fromArrayBuffer(data);
            setEntropies({ ...entropies });
          }
          return entropies;
        })
      );

      // Remove entries of files that were removed already
      if (res.length)
        setEntropies(
          Object.keys(res[res.length - 1]).reduce((res, key) => {
            if (selectedFiles.findIndex((f) => f.name == key) !== -1)
              res[key] = entropies[key];
            return res;
          }, {} as { [key: string]: number })
        );
    };

    updateEntropies();
  }, [selectedFiles]);

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
        {Object.keys(entropies).findIndex((k) => k == file.name) !== -1
          ? entropies[file.name].toFixed(2)
          : 'n/a'}
      </TableCell>
      <TableCell align="right">{formatSize(file.size)}</TableCell>
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
                Entropy
              </TableCell>
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
          <Typography>Size: {formatSize(calcSize(selectedFiles))}</Typography>
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

interface DataInputProps {
  onFinished: (files: File[], password: string) => void;
  maxFileSize?: number;
}

function DataInput({ onFinished, maxFileSize }: DataInputProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');

  const size = calcSize(files);

  return (
    <Stack direction="column" spacing={2}>
      <FileSelection onFilesSelected={setFiles} />
      <EnterPassword onPasswordEntered={setPassword} confirm />
      {maxFileSize && calcSize(files) > maxFileSize && (
        <Alert severity="warning">
          <AlertTitle>Maximum file size </AlertTitle>A maximum of
          {formatSize(maxFileSize)} can be uploaded. The selected files will be
          compressed in the next step, however it may be ineffective when
          handling high-entropy data. You may want to consider selecting fewer
          files for this upload.
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
  exfil: ExfilExtension;
  mode: SelectedMode;
  storage: StorageExtension;
  onFinished: (info: UploadInfo) => void;
  maxFileSize?: number;
}

function ProcessUpload({
  files,
  password,
  exfil,
  mode,
  storage,
  onFinished,
  maxFileSize,
}: ProcessUploadProps) {
  var [entries, setEntries] = useState<EventEntry[]>([]);

  const [encData, setEncData] = useState<ArrayBuffer | null>(null);
  const [encIv, setEncIv] = useState<ArrayBuffer | null>(null);

  const addEntry = (
    category: string,
    content: string,
    variant?: 'error' | 'success'
  ) => {
    entries = [...entries, createLogEntry(category, content, variant)];
    setEntries(entries);
  };

  useEffect(() => {
    const processFiles = async () => {
      const zipFile = jszip();
      addEntry('Compression', 'Starting...');
      await Promise.all(
        files.map(async (file) => {
          const data = await file.arrayBuffer();
          zipFile.file(file.name, data, { date: new Date(file.lastModified) });
        })
      );
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
        `Done: compressed ${formatSize(calcSize(files))} to ${formatSize(
          blob.byteLength
        )} (entropy: ${fromArrayBuffer(blob).toFixed(2)})`,
        'success'
      );
      addEntry('Encryption', 'Starting...');
      const [cipher, iv] = await encryptSymmetric(blob, password);
      addEntry(
        'Encryption',
        `Done: ${formatSize(cipher.byteLength)} (entropy: ${fromArrayBuffer(
          cipher
        ).toFixed(2)})`,
        'success'
      );
      setEncData(cipher);
      setEncIv(iv);
    };

    processFiles().catch((err) => {
      enqueueSnackbar({
        message: `Processing failed: ${err?.message ?? JSON.stringify(err)}`,
        variant: 'error',
      });
      addEntry('ERROR', err?.message ?? JSON.stringify(err), 'error');
    });
  }, []);

  useEffect(() => {
    if (!encData || !encIv) return;
    const performUpload = async () => {
      const data = encData as ArrayBuffer;
      const iv = encIv as ArrayBuffer;
      var tmp = new Uint8Array(data.byteLength + iv.byteLength);
      tmp.set(new Uint8Array(iv), 0);
      tmp.set(new Uint8Array(data), iv.byteLength);

      if (maxFileSize && tmp.byteLength > maxFileSize) {
        throw new Error(
          `File size ${formatSize(
            tmp.byteLength
          )} exceeds the allowed maximum of ${formatSize(
            maxFileSize
          )}; aborting.`
        );
      }

      addEntry('Upload', 'Starting...');
      const res =
        mode == 'UploadSingle'
          ? await exfil.uploadSingle(storage.name, tmp, addEntry)
          : await exfil.uploadChunked(storage.name, tmp, addEntry);
      addEntry('Upload', 'Done!', 'success');
      enqueueSnackbar({
        message: 'Upload finished!',
        variant: 'success',
      });
      onFinished({
        id: res.id as string,
        lifeTime: res.lifeTime as number,
      });
    };

    performUpload().catch((err) => {
      enqueueSnackbar({
        message: `Upload failed: ${err?.message ?? JSON.stringify(err)}`,
        variant: 'error',
      });
      addEntry('ERROR', err?.message ?? JSON.stringify(err), 'error');
    });
  }, [encData, encIv]);

  return (
    <>
      <EventTable entries={entries} />
    </>
  );
}

interface UploadInfoElementProps {
  info: UploadInfo;
}

function UploadInfoElement({ info }: UploadInfoElementProps) {
  const [remaining, setRemaining] = useState('00:00:00');
  const [ownNowDate, _] = useState(moment());

  useEffect(() => {
    const timer = setInterval(() => {
      const ownExpiryDate = moment(ownNowDate).add(info.lifeTime, 'ms');
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
          The uploaded data will be removed in {remaining} without any further
          notice.
        </Alert>
      </Box>
    </>
  );
}

interface UploadProps {
  exfil: ExfilExtension;
  mode: SelectedMode;
  storage: StorageExtension;
}

export default function GenericHttpUpload({
  exfil,
  storage,
  mode,
}: UploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(0);
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null);

  if (mode != 'UploadChunked' && mode != 'UploadSingle')
    throw new Error(`Unsupported mode ${mode}`);

  const steps = ['Data Input', 'Process & Upload', 'Done'];

  const maxSize = exfil.getConfig().max_total_size;

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
            maxFileSize={maxSize}
          />
        );
      case 1:
      case 2:
        return (
          <>
            <ProcessUpload
              files={files}
              password={password}
              exfil={exfil}
              storage={storage}
              onFinished={(info) => {
                setUploadInfo(info);
                setStep(2);
              }}
              maxFileSize={maxSize}
              mode={mode}
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
