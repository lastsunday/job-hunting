import {
  Box,
  Burger,
  Center,
  Collapse,
  Divider,
  Drawer,
  Group,
  HoverCard,
  ScrollArea,
  SimpleGrid,
  Text,
  ThemeIcon,
  UnstyledButton
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import logo from '../../assets/logo.svg';
import { creatFeature } from "../../components/feature";
import { EXTENSION_PLUGIN_URL } from '../../config';
import classes from './WebsiteHeader.module.css';

export function WebsiteHeader() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const [linksOpened, { toggle: toggleLinks }] = useDisclosure(false);

  const links = creatFeature("color-blue").map((item) => (
    <UnstyledButton className={classes.subLink} key={item.title}>
      <Group wrap="nowrap" align="flex-start">
        <ThemeIcon size={34} variant="default" radius="md">
          {item.icon}
        </ThemeIcon>
        <div>
          <Text size="sm" fw={500}>
            {item.title}
          </Text>
          <Text size="xs" c="dimmed">
            {item.description}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  ));

  return (
    <Box pb={120}>
      <header className={classes.header}>
        <Group justify="space-between" h="100%">
          <Group gap="xs">
            <img className={classes.logo} src={logo}></img>
            <Text>职位猎人</Text>
          </Group>
          <Group h="100%" gap={0} visibleFrom="sm">
            <a href="#" className={classes.link}>
              主页
            </a>
            <HoverCard width={600} position="bottom" radius="md" shadow="md" withinPortal>
              <HoverCard.Target>
                <a href="#" className={classes.link}>
                  <Center inline>
                    <Box component="span" mr={5}>
                      数据
                    </Box>
                    <div className={`i-mdi:chevron-down`}></div>
                  </Center>
                </a>
              </HoverCard.Target>

              <HoverCard.Dropdown style={{ overflow: 'hidden' }}>
                <Group justify="space-between" px="md">
                  <Text fw={500}>数据</Text>
                </Group>

                <Divider my="sm" />

                <SimpleGrid cols={2} spacing={0}>
                  {links}
                </SimpleGrid>

              </HoverCard.Dropdown>
            </HoverCard>
            <a href="#" className={classes.link}>
              统计
            </a>
            <a href={EXTENSION_PLUGIN_URL} target='_blank' className={classes.link} rel="noreferrer">
              插件
            </a>
          </Group>

          <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm" />
        </Group>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="导航"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">
          <Divider my="sm" />

          <a href="#" className={classes.link}>
            主页
          </a>
          <UnstyledButton className={classes.link} onClick={toggleLinks}>
            <Center inline>
              <Box component="span" mr={5}>
                数据
              </Box>
              <div className={`i-mdi:chevron-down`}></div>
            </Center>
          </UnstyledButton>
          <Collapse expanded={linksOpened}>{links}</Collapse>
          <a href="#" className={classes.link}>
            统计
          </a>
          <a href="#" className={classes.link}>
            插件
          </a>
        </ScrollArea>
      </Drawer>
    </Box >
  );
}
