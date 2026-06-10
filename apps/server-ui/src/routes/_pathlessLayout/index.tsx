import {
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Text,
  Title,
} from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';
import { creatFeature } from '../../components/feature';
import classes from './index.module.css';
import { WebsiteHeader } from '../../components/website/WebsiteHeader';
import { WebsiteFooter } from '../../components/website/WebsiteFooter';

export const Route = createFileRoute('/_pathlessLayout/')({
  component: HomeComponent,
});

function HomeComponent() {
  const features = creatFeature('size-10 color-blue').map((feature) => (
    <Card
      key={feature.title}
      shadow="md"
      radius="md"
      className={classes.card}
      padding="xl"
    >
      {feature.icon}
      <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
        {feature.title}
      </Text>
      <Text fz="sm" c="dimmed" mt="sm">
        {feature.description}
      </Text>
    </Card>
  ));

  return (
    <Container py="md">
      <WebsiteHeader />
      <Container size="lg" py="xl">
        <Group justify="center">
          <Badge color="green" variant="filled" size="lg">
            共享开源
          </Badge>
        </Group>

        <Title order={2} className={classes.title} ta="center" mt="sm">
          职位猎人 - 协助找工作的工具
        </Title>

        <Text c="dimmed" className={classes.description} ta="center" mt="md">
          <Text>
            为了提高使用这些招聘平台找工作的用户体验，对目标平台网站页面进行增强展示
          </Text>
          <Text>
            对职位进行永久存储，以便进行全网职位的个性化快速搜索，职位数据的共享
          </Text>
          <Text>对职位数据进行多维度的分析，并以可视化的手段呈现</Text>
          <Text>
            通过内置的讨论区，对职位进行评论，为职位打上标签等方式进行中立的职位交流
          </Text>
        </Text>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={50}>
          {features}
        </SimpleGrid>
      </Container>
      <WebsiteFooter />
    </Container>
  );
}
