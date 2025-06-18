import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  TextField,
  Button,
  Modal,
  FormLayout,
  Banner,
  Box,
  Divider,
  InlineGrid,
  InlineStack,
  Checkbox,
  Badge,
  EmptyState
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback, useMemo } from "react";
import { DeleteIcon, EditIcon, PlusIcon } from '@shopify/polaris-icons';
import { useLoaderData, useSubmit, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const tasks = await prisma.task.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' }
  });

  return json(tasks);
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const action = formData.get("action");

  switch (action) {
    case "create": {
      const title = formData.get("title");
      const description = formData.get("description");
      await prisma.task.create({
        data: {
          title,
          description,
          shop,
        },
      });
      break;
    }
    case "update": {
      const id = formData.get("id");
      const title = formData.get("title");
      const description = formData.get("description");
      const completed = formData.get("completed") === "true";
      await prisma.task.update({
        where: { id },
        data: {
          title,
          description,
          completed,
        },
      });
      break;
    }
    case "delete": {
      const id = formData.get("id");
      await prisma.task.delete({
        where: { id },
      });
      break;
    }
    case "deleteCompleted": {
      await prisma.task.deleteMany({
        where: {
          shop,
          completed: true,
        },
      });
      break;
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
  return null;
}

const INITIAL_TASK = { title: "", description: "", completed: false };

export default function Todolist() {
  const tasks = useLoaderData() || [];
  const submit = useSubmit();
  const fetcher = useFetcher();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(INITIAL_TASK);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const isEditing = editingId !== null;

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'pending':
        return tasks.filter(task => !task.completed);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const validateTask = useCallback(() => {
    return currentTask.title.trim().length > 0;
  }, [currentTask.title]);

  const resetModal = useCallback(() => {
    setCurrentTask(INITIAL_TASK);
    setEditingId(null);
    setIsModalOpen(false);
  }, []);

  const handleTaskSubmit = useCallback(() => {
    if (!validateTask()) return;

    const formData = new FormData();
    formData.append("action", isEditing ? "update" : "create");
    formData.append("title", currentTask.title.trim());
    formData.append("description", currentTask.description.trim());
    
    if (isEditing) {
      formData.append("id", editingId);
      formData.append("completed", currentTask.completed.toString());
    }

    submit(formData, { method: "post" });
    resetModal();
  }, [currentTask, editingId, isEditing, validateTask, submit, resetModal]);

  const handleDeleteTask = useCallback((taskId) => {
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("id", taskId);
    submit(formData, { method: "post" });
  }, [submit]);

  const handleEditTask = useCallback((task) => {
    setCurrentTask({
      title: task.title,
      description: task.description,
      completed: task.completed
    });
    setEditingId(task.id);
    setIsModalOpen(true);
  }, []);

  const handleToggleComplete = useCallback((taskId, checked) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const formData = new FormData();
    formData.append("action", "update");
    formData.append("id", taskId);
    formData.append("title", task.title);
    formData.append("description", task.description || "");
    formData.append("completed", checked.toString());
    submit(formData, { method: "post" });
  }, [tasks, submit]);

  const handleDeleteCompleted = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "deleteCompleted");
    submit(formData, { method: "post" });
  }, [submit]);

  const handleFieldChange = useCallback((field, value) => {
    setCurrentTask(prev => ({ ...prev, [field]: value }));
  }, []);

  const renderTaskActions = useCallback((task) => (
    <InlineStack gap="200">
      <Button
        icon={EditIcon}
        variant="tertiary"
        size="slim"
        onClick={() => handleEditTask(task)}
        accessibilityLabel={`Edit task: ${task.title}`}
      />
      <Button
        icon={DeleteIcon}
        variant="tertiary"
        tone="critical"
        size="slim"
        onClick={() => handleDeleteTask(task.id)}
        accessibilityLabel={`Delete task: ${task.title}`}
      />
    </InlineStack>
  ), [handleEditTask, handleDeleteTask]);

  const renderFilterButtons = useCallback(() => (
    <InlineStack gap="200">
      <Button
        pressed={filter === 'all'}
        onClick={() => setFilter('all')}
        size="slim"
      >
        All ({taskStats.total})
      </Button>
      <Button
        pressed={filter === 'pending'}
        onClick={() => setFilter('pending')}
        size="slim"
      >
        Pending ({taskStats.pending})
      </Button>
      <Button
        pressed={filter === 'completed'}
        onClick={() => setFilter('completed')}
        size="slim"
      >
        Completed ({taskStats.completed})
      </Button>
    </InlineStack>
  ), [filter, taskStats]);

  const renderTaskCard = useCallback((task) => (
    <Card key={task.id}>
      <Box padding="400">
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="start">
            <InlineStack gap="300" blockAlign="start">
              <Checkbox
                checked={task.completed}
                onChange={(checked) => handleToggleComplete(task.id, checked)}
                ariaDescribedBy={`task-${task.id}`}
              />
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <Text
                    as="h3"
                    variant="headingMd"
                    tone={task.completed ? "subdued" : undefined}
                    textDecorationLine={task.completed ? "line-through" : undefined}
                    id={`task-${task.id}`}
                  >
                    {task.title}
                  </Text>
                  {task.completed && <Badge tone="success">Completed</Badge>}
                </InlineStack>
                {task.description && (
                  <Text
                    as="p"
                    variant="bodyMd"
                    tone={task.completed ? "subdued" : undefined}
                  >
                    {task.description}
                  </Text>
                )}
              </BlockStack>
            </InlineStack>
            {renderTaskActions(task)}
          </InlineStack>
        </BlockStack>
      </Box>
    </Card>
  ), [handleToggleComplete, renderTaskActions]);

  return (
    <Page>
      <TitleBar title="To-Do List" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Card roundedAbove="sm">
                <InlineGrid columns="1fr auto" gap="400" align="center">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingSm">
                      Tasks
                    </Text>
                    {taskStats.total > 0 && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        {taskStats.completed} of {taskStats.total} completed
                      </Text>
                    )}
                  </BlockStack>
                  <InlineStack gap="200">
                    {taskStats.completed > 0 && (
                      <Button
                        variant="tertiary"
                        tone="critical"
                        size="slim"
                        onClick={handleDeleteCompleted}
                      >
                        Clear Completed
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => setIsModalOpen(true)}
                      accessibilityLabel="Add new task"
                      icon={PlusIcon}
                    >
                      Add Task
                    </Button>
                  </InlineStack>
                </InlineGrid>
              </Card>

              {taskStats.total > 0 && (
                <>
                  <Divider />
                  <Box paddingInlineStart="400" paddingInlineEnd="400">
                    {renderFilterButtons()}
                  </Box>
                </>
              )}

              <Divider />
              <Box padding="400">
                <BlockStack gap="400">
                  {taskStats.total === 0 ? (
                    <EmptyState
                      heading="No tasks yet"
                      action={{
                        content: 'Add your first task',
                        onAction: () => setIsModalOpen(true),
                      }}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Create tasks to stay organized and track your progress.</p>
                    </EmptyState>
                  ) : filteredTasks.length === 0 ? (
                    <Banner status="info">
                      <p>No {filter} tasks found.</p>
                    </Banner>
                  ) : (
                    filteredTasks.map(renderTaskCard)
                  )}
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={isModalOpen}
        onClose={resetModal}
        title={isEditing ? "Edit Task" : "Add New Task"}
        primaryAction={{
          content: isEditing ? "Update Task" : "Add Task",
          onAction: handleTaskSubmit,
          disabled: !validateTask(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: resetModal,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Title"
              value={currentTask.title}
              onChange={(value) => handleFieldChange('title', value)}
              autoComplete="off"
              requiredIndicator
              error={currentTask.title.trim().length === 0 && currentTask.title.length > 0 ? "Title is required" : undefined}
            />
            <TextField
              label="Description"
              value={currentTask.description}
              onChange={(value) => handleFieldChange('description', value)}
              multiline={4}
              autoComplete="off"
              helpText="Optional: Add more details about this task"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}