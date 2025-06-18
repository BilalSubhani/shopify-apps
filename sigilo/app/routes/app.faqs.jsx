import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  InlineStack,
  TextField,
  Modal,
  FormLayout,
  EmptyState,
  Toast,
  Frame,
  Box,
  Divider,
  ResourceList,
  ResourceItem,
  ButtonGroup,
  Spinner,
  Autocomplete,
} from '@shopify/polaris';
import { useEffect, useState, useCallback } from 'react';
import { useLoaderData, useFetcher, useNavigate } from '@remix-run/react';
import { 
  PlusIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon
} from '@shopify/polaris-icons';
import { TitleBar } from "@shopify/app-bridge-react";

export { loader, action } from '../routes/api.faqs';

export default function FaqPage() {
  const { products, faqs: initialFaqs } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [selectedProduct, setSelectedProduct] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({ question: '', answer: '' });
  const [toastMessage, setToastMessage] = useState(null);
  const [faqs, setFaqs] = useState(initialFaqs || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedProductTitle, setSelectedProductTitle] = useState('');

  // Handle FAQ data updates
  useEffect(() => {
    if (fetcher.data?.faqs) {
      setFaqs(fetcher.data.faqs);
    }
  }, [fetcher.data]);

  // Handle form submission response
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setIsSubmitting(false);
      if (fetcher.data.success) {
        if (editingFaq) {
          setToastMessage('FAQ updated successfully!');
          setShowModal(false);
          setEditingFaq(null);
          setFormData({ question: '', answer: '' });
        } else if (formData.question) {
          setToastMessage('FAQ added successfully!');
          setShowModal(false);
          setFormData({ question: '', answer: '' });
        } else {
          setToastMessage('FAQ deleted successfully!');
        }
        setFaqs(fetcher.data.faqs);
      } else if (fetcher.data.error) {
        setToastMessage(fetcher.data.error);
      }
    }
  }, [fetcher.state, fetcher.data, editingFaq, formData.question]);

  const handleProductChange = useCallback((value) => {
    setSelectedProduct(value);
    setFaqs([]);
    const product = products.find(p => p.id === value);
    setSelectedProductTitle(product?.title || '');
    if (value) {
      fetcher.load(`/api/faqs?productId=${value}`);
    }
  }, [fetcher, products]);

  const handleModalOpen = useCallback((faq = null) => {
    setEditingFaq(faq);
    setFormData({
      question: faq?.question || '',
      answer: faq?.answer || ''
    });
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    if (!isSubmitting) {
      setShowModal(false);
      setEditingFaq(null);
      setFormData({ question: '', answer: '' });
    }
  }, [isSubmitting]);

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      setToastMessage('Please fill in both question and answer fields');
      return;
    }
    setIsSubmitting(true);
    const submitData = new FormData();
    submitData.append('productId', selectedProduct);
    submitData.append('intent', editingFaq ? 'edit' : 'add');
    if (editingFaq) submitData.append('faqId', editingFaq.id);
    submitData.append('question', formData.question);
    submitData.append('answer', formData.answer);
    
    fetcher.submit(submitData, { method: 'post' });
  }, [formData, editingFaq, selectedProduct, fetcher]);

  const handleDelete = useCallback((faqId) => {
    const deleteData = new FormData();
    deleteData.append('productId', selectedProduct);
    deleteData.append('intent', 'delete');
    deleteData.append('faqId', faqId);
    
    fetcher.submit(deleteData, { method: 'post' });
  }, [selectedProduct, fetcher]);

  const handleInputChange = useCallback((value) => {
    setInputValue(value);
  }, []);

  const handleSelect = useCallback((selected) => {
    const selectedValue = selected[0];
    setSelectedOptions(selected);
    handleProductChange(selectedValue);
  }, [handleProductChange]);

  const deselectedOptions = products.map(product => ({
    label: product.title,
    value: product.id,
  }));

  const renderFaqItem = (faq) => (
    <ResourceItem
      id={faq.id}
      accessibilityLabel={`FAQ ${faq.question}`}
    >
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="start">
          <BlockStack gap="100">
            <Text variant="bodyMd" fontWeight="semibold">
              {faq.question}
            </Text>
            <Text variant="bodySm" tone="subdued">
              {faq.answer}
            </Text>
          </BlockStack>

          <ButtonGroup>
            <Button
              size="micro"
              icon={EditIcon}
              onClick={() => handleModalOpen(faq)}
            >
              Edit
            </Button>
            <Button
              size="micro"
              icon={DeleteIcon}
              onClick={() => handleDelete(faq.id)}
              tone="critical"
            >
              Delete
            </Button>
          </ButtonGroup>
        </InlineStack>
      </BlockStack>
    </ResourceItem>
  );

  const emptyState = (
    <EmptyState
      heading="No FAQs found"
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <Text>Add FAQs to help customers understand your product better.</Text>
    </EmptyState>
  );

  return (
    <Frame>
      <Page>
        <TitleBar title="FAQ Management" />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd">Product FAQ Management</Text>
                    <Text variant="bodySm" tone="subdued">
                      {selectedProductTitle ? `Managing FAQs for: ${selectedProductTitle}` : 'Select a product to manage its FAQs'}
                    </Text>
                  </BlockStack>
                </InlineStack>

                <Divider />

                <BlockStack gap="400">
                  <Autocomplete
                    options={deselectedOptions}
                    selected={selectedOptions}
                    onSelect={handleSelect}
                    label="Search and select a product"
                    placeholder="Search products..."
                    textField={
                      <Autocomplete.TextField
                        onChange={handleInputChange}
                        value={inputValue}
                        prefix={<SearchIcon />}
                        autoComplete="off"
                      />
                    }
                  />
                </BlockStack>

                {selectedProduct && (
                  <>
                    <InlineStack align="end">
                      <Button
                        primary
                        icon={PlusIcon}
                        onClick={() => handleModalOpen()}
                      >
                        Add FAQ
                      </Button>
                    </InlineStack>

                    {faqs.length === 0 ? (
                      emptyState
                    ) : (
                      <ResourceList
                        resourceName={{ singular: 'FAQ', plural: 'FAQs' }}
                        items={faqs}
                        renderItem={renderFaqItem}
                        showHeader={false}
                      />
                    )}
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">FAQ Management Tips</Text>
                  <BlockStack gap="300">
                    <Text variant="bodySm">
                      • Keep questions clear and concise
                    </Text>
                    <Text variant="bodySm">
                      • Provide detailed but easy-to-understand answers
                    </Text>
                    <Text variant="bodySm">
                      • Cover common customer concerns
                    </Text>
                    <Text variant="bodySm">
                      • Update FAQs as product information changes
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {showModal && (
          <Modal
            open={showModal}
            onClose={handleModalClose}
            title={editingFaq ? "Edit FAQ" : "Add FAQ"}
            primaryAction={{
              content: editingFaq ? "Save changes" : "Add FAQ",
              onAction: handleSubmit,
              loading: isSubmitting,
            }}
            secondaryActions={[
              {
                content: "Cancel",
                onAction: handleModalClose,
                disabled: isSubmitting,
              },
            ]}
          >
            <Modal.Section>
              <FormLayout>
                <TextField
                  label="Question"
                  value={formData.question}
                  onChange={(value) => handleFormChange('question', value)}
                  autoComplete="off"
                  disabled={isSubmitting}
                />
                <TextField
                  label="Answer"
                  value={formData.answer}
                  onChange={(value) => handleFormChange('answer', value)}
                  multiline={4}
                  autoComplete="off"
                  disabled={isSubmitting}
                />
              </FormLayout>
            </Modal.Section>
          </Modal>
        )}

        {toastMessage && (
          <Toast 
            content={toastMessage} 
            onDismiss={() => setToastMessage(null)} 
          />
        )}
      </Page>
    </Frame>
  );
} 