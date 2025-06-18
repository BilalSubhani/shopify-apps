import {
    Page,
    Layout,
    Card,
    Select,
    Button,
    BlockStack,
    Spinner,
    Text,
    InlineStack,
    ResourceList,
    ResourceItem,
    Thumbnail,
    Badge,
    EmptyState,
    Pagination,
    Filters,
    ChoiceList,
    Toast,
    Frame,
    Box,
    Divider,
    Icon,
  } from '@shopify/polaris';
  import { useEffect, useState, useCallback } from 'react';
  import { useLoaderData, useFetcher, useNavigate, useLocation } from '@remix-run/react';
  import { 
    ProductFilledIcon,
    SaveIcon
  } from '@shopify/polaris-icons';
  import { TitleBar } from "@shopify/app-bridge-react";
  
  export { loader } from '../routes/api.products';
  export { action } from '../routes/api.products';
  
  export default function ProductsPage() {
    const { products, badgeList, hasNextPage, hasPreviousPage } = useLoaderData();
    const fetcher = useFetcher();
    const navigate = useNavigate();
    const location = useLocation();

    const [badgeSelections, setBadgeSelections] = useState({});
    const [searchValue, setSearchValue] = useState('');
    const [selectedBadgeFilter, setSelectedBadgeFilter] = useState([]);
    const [toastMessage, setToastMessage] = useState(null);
    const [savingProducts, setSavingProducts] = useState(new Set());
  
    const currentPage = parseInt(new URLSearchParams(location.search).get("page") || "1");

    useEffect(() => {
      if (fetcher.state === 'idle' && fetcher.data) {
        const productId = fetcher.data.productId;
        
        if (productId) {
          // Clear saving state first
          setSavingProducts(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });

          if (fetcher.data.success) {
            setToastMessage('Badge assignment saved successfully');
            setBadgeSelections(prev => {
              const newSelections = { ...prev };
              delete newSelections[productId];
              return newSelections;
            });
          } else if (fetcher.data.error) {
            setToastMessage(fetcher.data.error);
          }
        }
      }
    }, [fetcher.state, fetcher.data]); 

    const handleBadgeChange = useCallback((productId, value) => {
      setBadgeSelections(prev => ({ ...prev, [productId]: value }));
    }, []);
  
    const handleSave = useCallback((productId) => {
      const badgeName = badgeSelections[productId] || 'N/A';
      
      // Set saving state before submitting
      setSavingProducts(prev => new Set(prev).add(productId));
      
      // Submit the form
      fetcher.submit({ productId, badgeName }, { method: 'post' });
    }, [badgeSelections, fetcher]);

    const goToPage = useCallback((page) => {
      navigate(`?page=${page}`);
    }, [navigate]);
  
    const handleFiltersQueryChange = useCallback((value) => {
      setSearchValue(value);
    }, []);
  
    const handleBadgeFilterChange = useCallback((value) => {
      setSelectedBadgeFilter(value);
    }, []);
  
    const handleFiltersClear = useCallback(() => {
      setSearchValue('');
      setSelectedBadgeFilter([]);
    }, []);

    const badgeOptions = [
      { label: 'None', value: 'N/A' },
      ...badgeList.map(badge => ({ 
        label: badge.name, 
        value: badge.name 
      }))
    ];

    const badgeFilterOptions = badgeList.map(badge => ({
      label: badge.name,
      value: badge.name,
    }));

    const filteredProducts = products.filter(product => {
      const matchesSearch = !searchValue || 
        product.title.toLowerCase().includes(searchValue.toLowerCase());
      
      const matchesBadgeFilter = selectedBadgeFilter.length === 0 || 
        selectedBadgeFilter.includes(product.badge) ||
        (selectedBadgeFilter.includes('None') && (!product.badge || product.badge === 'N/A'));
      
      return matchesSearch && matchesBadgeFilter;
    });
 
    const renderProductItem = (product) => {
      const isModified = badgeSelections[product.id] !== undefined;
      const isSaving = savingProducts.has(product.id);
      const currentSelection = badgeSelections[product.id] || product.badge || 'N/A';
  
      return (
        <ResourceItem
          id={product.id}
          media={
            <Thumbnail
            source={ProductFilledIcon }
            alt={product.title}
            size="small"
            />
          }
          accessibilityLabel={`Product ${product.title}`}
        >
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="start">
              <BlockStack gap="100">
                <Text variant="bodyMd" fontWeight="semibold">
                  {product.title}
                </Text>
                <InlineStack gap="300">
                  <Text variant="bodySm" tone="subdued">
                    Inventory: {product.inventory}
                  </Text>
                  {product.badge && product.badge !== 'N/A' && (
                    <Badge tone="info">{product.badge}</Badge>
                  )}
                </InlineStack>
              </BlockStack>
  
              <InlineStack gap="200" blockAlign="center">
                <Select
                  options={badgeOptions}
                  value={currentSelection}
                  onChange={(value) => handleBadgeChange(product.id, value)}
                  placeholder="Select badge"
                  disabled={isSaving}
                />
                <Button
                  size="micro"
                  icon={SaveIcon}
                  onClick={() => handleSave(product.id)}
                  loading={isSaving}
                  disabled={!isModified || isSaving}
                  tone={isModified && !isSaving ? 'success' : undefined}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </ResourceItem>
      );
    };

    const emptyState = (
      <EmptyState
        heading="No products found"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <Text>Try adjusting your search or filter criteria.</Text>
      </EmptyState>
    );

    if (products.length === 0 && !searchValue && selectedBadgeFilter.length === 0) {
      return (
        <Frame>
          <Page title="Badge Assignment">
            <Layout>
              <Layout.Section>
                <Card>
                  <BlockStack align="center" gap="400">
                    <Spinner accessibilityLabel="Loading products" size="large" />
                    <Text>Loading products...</Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          </Page>
        </Frame>
      );
    }

    const filters = [
      {
        key: 'badge',
        label: 'Badge',
        filter: (
          <ChoiceList
            title="Badge"
            titleHidden
            choices={[
              ...badgeFilterOptions,
              { label: 'None', value: 'None' }
            ]}
            selected={selectedBadgeFilter}
            onChange={handleBadgeFilterChange}
            allowMultiple
          />
        ),
        shortcut: true,
      },
    ];
  
    const appliedFilters = [];
    if (selectedBadgeFilter.length > 0) {
      appliedFilters.push({
        key: 'badge',
        label: `Badge: ${selectedBadgeFilter.join(', ')}`,
        onRemove: () => setSelectedBadgeFilter([]),
      });
    }
  
    return (
      <Frame>
        <Page>
        <TitleBar title="Badge Assignment" />
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text variant="headingMd">Product Badge Management</Text>
                      <Text variant="bodySm" tone="subdued">
                        {filteredProducts.length} of {products.length} products shown
                      </Text>
                    </BlockStack>
                  </InlineStack>
  
                  <Divider />
  
                  <Filters
                    queryValue={searchValue}
                    queryPlaceholder="Search products"
                    filters={filters}
                    appliedFilters={appliedFilters}
                    onQueryChange={handleFiltersQueryChange}
                    onQueryClear={() => setSearchValue('')}
                    onClearAll={handleFiltersClear}
                  />
  
                  {filteredProducts.length === 0 ? (
                    emptyState
                  ) : (
                    <ResourceList
                      resourceName={{ singular: 'product', plural: 'products' }}
                      items={filteredProducts}
                      renderItem={renderProductItem}
                      showHeader={false}
                    />
                  )}
  
                  {(hasNextPage || hasPreviousPage) && (
                    <Box paddingBlockStart="400">
                      <InlineStack align="center">
                        <Pagination
                          hasPrevious={hasPreviousPage}
                          onPrevious={() => goToPage(currentPage - 1)}
                          hasNext={hasNextPage}
                          onNext={() => goToPage(currentPage + 1)}
                          label={`Page ${currentPage}`}
                        />
                      </InlineStack>
                    </Box>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
  
            <Layout.Section variant="oneThird">
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Badge Assignment Tips</Text>
                    <BlockStack gap="300">
                      <Text variant="bodySm">
                        • Use badges to highlight featured products
                      </Text>
                      <Text variant="bodySm">
                        • Assign seasonal or promotional badges
                      </Text>
                      <Text variant="bodySm">
                        • Select "None" to remove a badge
                      </Text>
                      <Text variant="bodySm">
                        • Changes are saved immediately after clicking Save
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Card>
  
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Available Badges</Text>
                    {badgeList.length === 0 ? (
                      <Text variant="bodySm" tone="subdued">
                        No badges available. Create badges in the settings page.
                      </Text>
                    ) : (
                      <BlockStack gap="200">
                        {badgeList.map(badge => (
                          <InlineStack key={badge.id} gap="200" blockAlign="center">
                            <Badge tone="info">{badge.name}</Badge>
                          </InlineStack>
                        ))}
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
  
          {toastMessage && (
            <Toast 
              content={toastMessage} 
              onDismiss={() => setToastMessage(null)} 
            />
          )}

            <Box paddingBlockEnd="500" />
        </Page>
      </Frame>
    );
  }