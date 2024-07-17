import { enqueueSnackbar } from 'notistack';

export function snackSuccess(message: string) {
  enqueueSnackbar({ variant: 'success', message: message });
}

export function snackError(message: string) {
  enqueueSnackbar({ variant: 'error', message: message });
}

export function snackInfo(message: string) {
  enqueueSnackbar({ variant: 'info', message: message });
}

export function snackWarning(message: string) {
  enqueueSnackbar({ variant: 'warning', message: message });
}

export function snack(message: string) {
  enqueueSnackbar({ variant: 'default', message: message });
}
