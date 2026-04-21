import { showNotification } from '@mantine/notifications';
import i18n from '@/i18n/i18n';
import { ApiError } from './http';

export function handleApiError(error: unknown) {
  let code = 0;
  let message = '操作失败';

  if (error instanceof ApiError) {
    code = error.code;
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  const key = String(code);
  const translated = i18n.t(`error:${key}`);

  showNotification({
    color: 'red',
    title: i18n.t('common:error'),
    message: translated !== `error:${key}` ? translated : message,
  });
}
