import { DateTimePicker, DateTimePickerProps } from '@mantine/dates';
import { useTranslation } from 'react-i18next';

interface LocalizedDateTimePickerProps extends Omit<
  DateTimePickerProps,
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

  const handleChange = (dateValue: Date | null) => {
    if (onChange) {
      if (dateValue === null) {
        onChange(undefined);
      } else {
        onChange(dateValue);
      }
    }
  };

  return (
    <DateTimePicker
      {...props}
      value={value || null}
      onChange={handleChange}
      locale={i18n.language === 'zh' ? 'zh-cn' : 'en'}
      valueFormat="YYYY-MM-DD HH:mm:ss"
      timePickerProps={{
        format: '24h',
        ...props.timePickerProps,
      }}
    />
  );
}
