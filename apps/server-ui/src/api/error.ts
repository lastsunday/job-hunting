import { showNotification } from '@mantine/notifications';
import i18n from '@/i18n/i18n';
import { ApiError } from './http';

export function handleApiError(error: unknown) {
  let code = 0;
  let message = '操作失败';

  if (error instanceof ApiError) {
    code = error.code;
    message = error.message;
    const key = String(code);
    const translated = i18n.t(`error:${key}`);

    showNotification({
      color: 'red',
      title: i18n.t('common:error'),
      message: translated !== `error:${key}` ? translated : message,
    });
  } else if (error instanceof Error) {
    message = error.message;
    showNotification({
      color: 'red',
      title: i18n.t('common:error'),
      message: message,
    });
    console.error(error);
  } else {
    message = String(error);
    showNotification({
      color: 'red',
      title: i18n.t('common:error'),
      message: message,
    });
    console.error(error);
  }

}
