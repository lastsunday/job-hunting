import { Avatar, Group, Text, UnstyledButton } from '@mantine/core';
import classes from './UserButton.module.css';

export function UserButton(props: { name: string | undefined }) {
  const { name } = props;
  return (
    <UnstyledButton className={classes.user}>
      <Group>
        <Avatar
          src=""
          radius="xl"
        />

        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500}>
            {name ?? 'N/A'}
          </Text>

          <Text c="dimmed" size="xs">
          </Text>
        </div>

        <div className="i-mdi:chevron-right"></div>
      </Group>
    </UnstyledButton >
  );
}
