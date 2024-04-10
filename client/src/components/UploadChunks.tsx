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
import { encryptSymmetric } from '../utils/Crypto';
import Api, { ApiConfigResponse } from '../utils/Api';
import { enqueueSnackbar } from 'notistack';
import moment from 'moment';
import EnterPassword from './EnterPassword';
import { calcSize, formatSize } from '../utils/Files';
import { fromArrayBuffer } from '../utils/Entropy';
import Config from '../utils/Config';

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
    Promise.all(
      selectedFiles.map(async (file) => {
        if (Object.keys(entropies).findIndex((k) => k == file.name) === -1) {
          const data = await file.arrayBuffer();
          entropies[file.name] = fromArrayBuffer(data);
          setEntropies({ ...entropies });
        }
        return entropies;
      })
    ).then((res) => {
      // Remove entries of files that were removed already
      if (res.length)
        setEntropies(
          Object.keys(res[res.length - 1]).reduce((res, key) => {
            if (selectedFiles.findIndex((f) => f.name == key) !== -1)
              res[key] = entropies[key];
            return res;
          }, {} as { [key: string]: number })
        );
    });
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
          <AlertTitle>Maximum file size </AlertTitle>A maximum of{' '}
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
  api: Api;
  onFinished: (info: UploadInfo) => void;
  maxFileSize?: number;
}

/**
 * Splits an ArrayBuffer into multiple chunks based on the specified chunk size.
 * 
 * @param buffer - The ArrayBuffer to split.
 * @param chunkSizeMB - The size of each chunk in megabytes.
 * @returns An array of ArrayBuffer chunks.
 */
function splitArrayBuffer(buffer: ArrayBuffer, chunkSizeMB: number): ArrayBuffer[] {
  const chunks: ArrayBuffer[] = [];
  const chunkSizeBytes = chunkSizeMB * 1024 * 1024;

  for (let i = 0; i < buffer.byteLength; i += chunkSizeBytes) {
    const end = Math.min(buffer.byteLength, i + chunkSizeBytes);
    const chunk = buffer.slice(i, end);
    chunks.push(chunk);
  }

  return chunks;
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
          `Done: compressed ${formatSize(calcSize(files))} to ${formatSize(
            blob.byteLength
          )} (entropy: ${fromArrayBuffer(blob).toFixed(2)})`,
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
          `Done: ${formatSize(cipher.byteLength)} (entropy: ${fromArrayBuffer(
            cipher
          ).toFixed(2)})`,
          'success'
        );
        setEncData(cipher);
        setEncIv(iv);
        return Promise.resolve([cipher, iv]);
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
    tmp.set(new Uint8Array(iv), 0);
    tmp.set(new Uint8Array(data), iv.byteLength);

    if (maxFileSize && tmp.byteLength > maxFileSize) {
      addEntry(
        'ERROR',
        `File size ${formatSize(
          tmp.byteLength
        )} exceeds the allowed maximum of ${formatSize(
          maxFileSize
        )}; aborting.`,
        'error'
      );
      return;
    }

    addEntry('Domains', 'Registering...');
    
    var chunks = splitArrayBuffer(tmp, Config.CHUNK_SIZE_MB);

    api.registerDomains(chunks.length)
      .then((res) => {
        if (!res.domains || !res.transferId || res.domains == undefined || res.transferId == undefined)
          return Promise.reject('Failed to register Cloudfront domains');

        enqueueSnackbar({
          message: 'Domains registered!',
          variant: 'success',
        });
        addEntry('Domains', `Done: ${chunks.length} domains registered`, 'success');

        addEntry('Domains', 'Deploying...');

        //check the domain status before uploading
          api.waitForDomainsDeployed(res.transferId)
            .then((res1) => {
              enqueueSnackbar({
                message: 'Domains deployed!',
                variant: 'success',
              });
              addEntry('Domains', 'Done: all domains deployed', 'success');
              
              //for each chunk in chunks call api.uploadChunk
              chunks.forEach((chunk, i) => {
                if (res.domains == undefined || res.transferId == undefined)
                  return Promise.reject('Error in domain registration, either domains or transferId is undefined');
      
                addEntry('Upload', 'Starting...');
                api
                  .uploadChunk(chunk, res.domains[i], res.transferId, i)
                  .then((res2) => {
                    addEntry('Upload', `Chunk ${i} done!`, 'success');
                    enqueueSnackbar({
                      message: `Chunk ${i}/${chunks.length} uploaded!`,
                      variant: 'success',
                    });
                    // onFinished({
                    //   id: res.transferId as string,
                    //   lifeTime: res.lifeTime as number,
                    // });
                  })
                  .catch((err) => {
                    enqueueSnackbar({
                      message: `Upload failed: ${err?.message ?? JSON.stringify(err)}`,
                      variant: 'error',
                    });
                    addEntry('ERROR', err?.message ?? JSON.stringify(err), 'error');
                  });
              })
            }).catch((err) => {
              enqueueSnackbar({
                message: "Initialization failed: Deployment error",
                variant: 'error',
              });
              addEntry('ERROR', err?.message ?? JSON.stringify(err), 'error');
            });
      })
      .catch((err) => {
        enqueueSnackbar({
          message: `Deployment failed: ${err?.message ?? JSON.stringify(err)}`,
          variant: 'error',
        });
        addEntry('ERROR', err?.message ?? JSON.stringify(err), 'error');
      })

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
          The uploaded data will be removed in {remaining} without any further
          notice.
        </Alert>
      </Box>
    </>
  );
}

interface UploadProps {
  api: Api;
}

export default function UploadChunks({ api }: UploadProps) {
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
