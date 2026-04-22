import { DateInput, DateInputProps } from '@mantine/dates';
import { useTranslation } from 'react-i18next';

interface LocalizedDateTimePickerProps extends Omit<
  DateInputProps,
  'value' | 'onChange'
> {
  value?: Date | null;
  onChange?: (value: Date | undefined) => void;
}

export function LocalizedDateTimePicker({
  value,
  onChange,
  ...props
}: LocalizedDateTimePickerProps) {
  const { i18n } = useTranslation();

  const handleChange = (dateValue: Date | string | null) => {
    if (onChange) {
      if (dateValue === null) {
        onChange(undefined);
      } else if (typeof dateValue === 'string') {
        onChange(new Date(dateValue));
      } else {
        onChange(dateValue);
      }
    }
  };

  return (
    <DateInput
      {...props}
      value={value}
      onChange={handleChange}
      locale={i18n.language === 'zh' ? 'zh-cn' : 'en'}
      valueFormat="YYYY-MM-DD HH:mm:ss"
      withTime
    />
  );
}
