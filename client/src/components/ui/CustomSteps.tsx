import { StepIconProps } from '@mui/material/StepIcon';
import { Box, StepLabel, StepLabelProps, Typography } from '@mui/material';

const CustomStepIcon = (props: StepIconProps & { stepNumber: number }) => {
  const { active, completed, stepNumber } = props;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: active || completed ? 'primary.main' : 'grey.400',
        color: 'white',
      }}
    >
      <Typography variant="caption">{stepNumber}</Typography>
    </Box>
  );
};

const CustomStepLabel = (props: StepLabelProps & { stepNumber: number }) => {
  const { stepNumber, children, ...stepLabelProps } = props;

  return (
    <StepLabel
      StepIconComponent={(stepIconProps) => <CustomStepIcon {...stepIconProps} stepNumber={stepNumber} />}
      {...stepLabelProps}
    >
      {children}
    </StepLabel>
  );
};

export default CustomStepLabel;