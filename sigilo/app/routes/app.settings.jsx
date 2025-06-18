import {
    Page,
    Layout,
    Card,
    Icon,
    Text,
    Button,
    Modal,
    FormLayout,
    TextField,
    Select,
    InlineStack,
    BlockStack,
    Spinner,
    Banner,
    Toast,
    Frame,
    EmptyState,
    ResourceList,
    ResourceItem,
    Thumbnail,
    ButtonGroup,
    Divider,
    Box,
  } from '@shopify/polaris';
  import { useLoaderData, useFetcher } from '@remix-run/react';
  import { useState, useEffect, useCallback } from 'react';
  import { json } from '@remix-run/node';
  import { 
    StarFilledIcon, 
    RewardIcon, 
    PlusCircleIcon, 
    GlobeFilledIcon,
    PlusIcon,
    EditIcon,
    DeleteIcon
  } from '@shopify/polaris-icons';
  import { authenticate } from '../shopify.server';
  import { prisma } from '../db.server';
  import { TitleBar } from "@shopify/app-bridge-react";
  
  export const loader = async ({ request }) => {
    await authenticate.admin(request);
    const badges = await prisma.badge.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return json(badges);
  };
  
  export default function SettingsPage() {
    const badges = useLoaderData();
    const fetcher = useFetcher();
    
    // State management
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editBadge, setEditBadge] = useState(null);
    const [formData, setFormData] = useState({
      name: '',
      icon: 'StarFilled'
    });
  
    // Icon configuration
    const iconOptions = [
      { label: 'Star', value: 'StarFilled' },
      { label: 'Reward', value: 'Fire' },
      { label: 'Plus Circle', value: 'CirclePlus' },
      { label: 'Globe', value: 'Globe' },
    ];
  
    const iconMap = {
      StarFilled: StarFilledIcon,
      Fire: RewardIcon,
      CirclePlus: PlusCircleIcon,
      Globe: GlobeFilledIcon,
    };
  
    // Handle form submission response
    useEffect(() => {
      if (fetcher.data?.error) {
        setError(fetcher.data.error);
      } else if (fetcher.state === 'idle' && fetcher.data) {
        // Only close the modal if we have a successful response
        if (fetcher.data.id) {
          handleModalClose();
          setError(null);
          
          // Show success toast only for create/update actions
          if (editBadge) {
            setToastMessage('Badge updated successfully');
          } else if (showModal) {
            setToastMessage('Badge created successfully');
          }
        }
      }
    }, [fetcher.data, fetcher.state, editBadge]);
  
    // Modal handlers
    const handleModalOpen = useCallback((badge = null) => {
      setEditBadge(badge);
      setFormData({
        name: badge?.name || '',
        icon: badge?.icon || 'StarFilled'
      });
      setShowModal(true);
      setError(null);
    }, []);
  
    const handleModalClose = useCallback(() => {
      setShowModal(false);
      setEditBadge(null);
      setFormData({ name: '', icon: 'StarFilled' });
      setError(null);
    }, []);
  
    // Form handlers
    const handleFormChange = useCallback((field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (error) setError(null);
    }, [error]);
  
    const handleSubmit = useCallback(() => {
      if (!formData.name.trim()) {
        setError('Badge name is required');
        return;
      }
  
      const submitData = new FormData();
      submitData.append('intent', editBadge ? 'update' : 'create');
      if (editBadge) submitData.append('id', editBadge.id);
      submitData.append('name', formData.name.trim());
      submitData.append('icon', formData.icon);
      
      fetcher.submit(submitData, { method: 'post', action: '/api/badges' });
    }, [formData, editBadge, fetcher]);
  
    const handleDelete = useCallback((id) => {
      const deleteData = new FormData();
      deleteData.append('intent', 'delete');
      deleteData.append('id', id);
      
      fetcher.submit(deleteData, { method: 'post', action: '/api/badges' });
      setToastMessage('Badge deleted successfully');
    }, [fetcher]);
  
    const dismissToast = useCallback(() => {
      setToastMessage(null);
    }, []);
  
    const renderBadgeItem = (badge) => {
      const IconComponent = iconMap[badge.icon];
      
      return (
        <ResourceItem
          id={badge.id}
          media={
            <Thumbnail
              source={IconComponent}
              alt={badge.name}
              size="small"
            />
          }
          accessibilityLabel={`Badge ${badge.name}`}
        >
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text variant="bodyMd" fontWeight="semibold">
                  {badge.name}
                </Text>
                <Text variant="bodySm" tone="subdued">
                  Icon: {iconOptions.find(opt => opt.value === badge.icon)?.label}
                </Text>
              </BlockStack>
              
              <ButtonGroup>
                <Button
                  size="micro"
                  icon={EditIcon}
                  onClick={() => handleModalOpen(badge)}
                  accessibilityLabel={`Edit ${badge.name} badge`}
                >
                  Edit
                </Button>
                <Button
                  size="micro"
                  icon={DeleteIcon}
                  tone="critical"
                  onClick={() => handleDelete(badge.id)}
                  accessibilityLabel={`Delete ${badge.name} badge`}
                >
                  Delete
                </Button>
              </ButtonGroup>
            </InlineStack>
          </BlockStack>
        </ResourceItem>
      );
    };
  
    const emptyState = (
      <EmptyState
        heading="No badges created yet"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <Text>Create your first badge to get started with customer recognition.</Text>
      </EmptyState>
    );
  
    return (
      <Frame>
        <Page
          title="Badge Management"
          subtitle="Create and manage customer badges for your store"
          primaryAction={{
            content: 'Add Badge',
            icon: PlusIcon,
            onAction: () => handleModalOpen(),
          }}
        >
          <TitleBar title="Settings" />
          <Layout>
            <Layout.Section>
              {error && (
                <Box paddingBlockEnd="400">
                  <Banner status="critical" onDismiss={() => setError(null)}>
                    <Text>{error}</Text>
                  </Banner>
                </Box>
              )}
  
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text variant="headingMd">Your Badges</Text>
                      <Text variant="bodySm" tone="subdued">
                        {badges.length} {badges.length === 1 ? 'badge' : 'badges'} created
                      </Text>
                    </BlockStack>
                  </InlineStack>
  
                  <Divider />
  
                  {badges.length === 0 ? (
                    emptyState
                  ) : (
                    <ResourceList
                      resourceName={{ singular: 'badge', plural: 'badges' }}
                      items={badges}
                      renderItem={renderBadgeItem}
                      showHeader={false}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
  
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">About Badges</Text>
                  <BlockStack gap="300">
                    <Text variant="bodySm">
                      Badges help your customer recognize the best products for better engagement.
                    </Text>
                    <Text variant="bodySm">
                      Create custom badges with different icons to match your brand and product description.
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
  
          <Modal
            open={showModal}
            onClose={handleModalClose}
            title={editBadge ? 'Edit Badge' : 'Create New Badge'}
            primaryAction={{
              content: editBadge ? 'Update Badge' : 'Create Badge',
              onAction: handleSubmit,
              loading: fetcher.state === 'submitting',
              disabled: !formData.name.trim(),
            }}
            secondaryActions={[{
              content: 'Cancel',
              onAction: handleModalClose,
            }]}
          >
            <Modal.Section>
              <FormLayout>
                <TextField
                  label="Badge Name"
                  value={formData.name}
                  onChange={(value) => handleFormChange('name', value)}
                  placeholder="Enter badge name"
                  autoComplete="off"
                  error={error && !formData.name.trim() ? 'Badge name is required' : ''}
                  helpText="Choose a descriptive name for your badge"
                />
                
                <Select
                  label="Badge Icon"
                  options={iconOptions}
                  value={formData.icon}
                  onChange={(value) => handleFormChange('icon', value)}
                  helpText="Select an icon that represents this badge"
                />
                
                <Box paddingBlockStart="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" fontWeight="medium">Preview</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={iconMap[formData.icon]} tone="base" />
                      <Text variant="bodySm">
                        {formData.name || 'Badge name'}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </FormLayout>
            </Modal.Section>
          </Modal>
  
          {toastMessage && (
            <Toast content={toastMessage} onDismiss={dismissToast} />
          )}
        </Page>
      </Frame>
    );
  }