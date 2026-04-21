import { DateTimePicker, DateTimePickerProps } from '@mantine/dates';
import { useTranslation } from 'react-i18next';

export function LocalizedDateTimePicker(props: DateTimePickerProps) {
  const { i18n } = useTranslation();

  return (
    <DateTimePicker
      {...props}
      locale={i18n.language === 'zh' ? 'zh-cn' : 'en'}
      valueFormat="YYYY-MM-DD HH:mm:ss"
      timePickerProps={{
        format: '24h',
        ...props.timePickerProps,
      }}
    />
  );
}
