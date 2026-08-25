import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Upload, X, Filter, Grid, List, Eye, EyeOff, Star, Clock, DollarSign, RefreshCw, Loader2, AlertCircle, CheckCircle, ShoppingCart } from 'lucide-react';
import BulkUpload from '../components/BulkUpload';
import TrialBanner from '../components/TrialBanner';
import ValidationAlert from '../components/ValidationAlert';
import { apiWithRetry } from '../utils/apiClient';
import { 
  applyOptimisticUpdate, 
  confirmOperation, 
  rollbackOperation, 
  generateTemporaryId,
  getPendingOperations 
} from '../utils/menuOptimisticState';
import { executeWithDeduplication } from '../utils/menuRequestDeduplication';
import { getCachedItems, setCachedItems, invalidateCache, isCacheStale } from '../utils/menuCache';
import { compressImage, uploadImageWithProgress } from '../utils/imageCompression';

const MenuPage = ({ user }) => {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCanceller, setUploadCanceller] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'category', 'created'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdateErrors, setBulkUpdateErrors] = useState([]);
  const [bulkDrafts, setBulkDrafts] = useState({});
  const [bulkOriginals, setBulkOriginals] = useState({});
  const [bulkFailedIds, setBulkFailedIds] = useState([]);
  const [bulkOperation, setBulkOperation] = useState(null);
  const bulkAbortRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image_url: '',
    available: true,
    preparation_time: 15,
    is_popular: false,
    is_vegetarian: false,
    is_spicy: false,
    allergens: ''
  });
  
  // Optimistic update state
  const [pendingOperations, setPendingOperations] = useState(new Map());
  const [operationLoading, setOperationLoading] = useState(new Map());
  const [deletedItems, setDeletedItems] = useState(new Map()); // For undo functionality
  const [submitting, setSubmitting] = useState(false);
  const [cacheStale, setCacheStale] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const syncIntervalRef = useRef(null);

  // Enhanced filtered and sorted items with multiple filters
  const filteredAndSortedItems = useMemo(() => {
    let filtered = menuItems;

    // Search filter
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.allergens?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Availability filter
    if (showAvailableOnly) {
      filtered = filtered.filter(item => item.available);
    }

    // Price range filter
    if (priceRange.min !== '') {
      filtered = filtered.filter(item => parseFloat(item.price) >= parseFloat(priceRange.min));
    }
    if (priceRange.max !== '') {
      filtered = filtered.filter(item => parseFloat(item.price) <= parseFloat(priceRange.max));
    }

    // Sort items
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = parseFloat(a.price) || 0;
          bValue = parseFloat(b.price) || 0;
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'popularity':
          aValue = a.is_popular ? 1 : 0;
          bValue = b.is_popular ? 1 : 0;
          break;
        default: // name
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [debouncedSearchTerm, menuItems, selectedCategory, showAvailableOnly, priceRange, sortBy, sortOrder]);

  // Memoized categories for better performance
  const categories = useMemo(() => {
    const allCategories = [...new Set(menuItems.map(item => item.category))].sort();
    return [{ value: 'all', label: 'All Categories', count: menuItems.length }, 
            ...allCategories.map(cat => ({
              value: cat,
              label: cat,
              count: menuItems.filter(item => item.category === cat).length
            }))];
  }, [menuItems]);

  // Memoized category items to avoid recalculation
  const categoryItemsMap = useMemo(() => {
    const map = {};
    categories.forEach(category => {
      if (category.value === 'all') {
        map[category.value] = filteredAndSortedItems;
      } else {
        map[category.value] = filteredAndSortedItems.filter(item => item.category === category.value);
      }
    });
    return map;
  }, [categories, filteredAndSortedItems]);

  // Menu statistics
  const menuStats = useMemo(() => {
    const total = menuItems.length;
    const available = menuItems.filter(item => item.available).length;
    const avgPrice = menuItems.length > 0 
      ? (menuItems.reduce((sum, item) => sum + parseFloat(item.price || 0), 0) / menuItems.length).toFixed(2)
      : 0;
    const popular = menuItems.filter(item => item.is_popular).length;
    
    return { total, available, avgPrice, popular };
  }, [menuItems]);

  // Debounced search for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchMenuItems();
    
    // Start background sync
    startBackgroundSync();
    
    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Background synchronization
  const startBackgroundSync = () => {
    const pollInterval = 30000; // 30 seconds
    
    const poll = async () => {
      if (document.hidden) return; // Don't poll when page is hidden
      
      try {
        setBackgroundSyncing(true);
        const response = await apiWithRetry({
          method: 'get',
          url: `${API}/menu`,
          timeout: 10000
        });
        
        const freshItems = Array.isArray(response.data) ? response.data : [];
        
        // Never replace active bulk drafts while the editor has unsaved work.
        if (bulkUpdateOpen || bulkUpdating) return;
        setMenuItems(prevItems => {
          const merged = [...freshItems];
          const freshIds = new Set(freshItems.map(item => item.id));
          
          // Check for new items from other users
          const newItems = freshItems.filter(item => 
            !prevItems.find(prev => prev.id === item.id)
          );
          
          if (newItems.length > 0) {
            toast.info(`${newItems.length} new item(s) added by other users`, {
              duration: 3000
            });
          }
          
          return merged;
        });
        
        // Update cache
        setCachedItems(freshItems);
      } catch (error) {
        console.warn('Background sync failed:', error);
      } finally {
        setBackgroundSyncing(false);
      }
    };
    
    // Start polling
    syncIntervalRef.current = setInterval(poll, pollInterval);
    
    // Listen to visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      } else {
        syncIntervalRef.current = setInterval(poll, pollInterval);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  // Optimized fetch function with caching (stale-while-revalidate)
  const fetchMenuItems = useCallback(async (showRefreshIndicator = false) => {
    // Check cache first
    const cachedItems = getCachedItems();
    const isStale = isCacheStale();
    
    if (cachedItems && cachedItems.length > 0) {
      // Show cached data immediately
      setMenuItems(cachedItems);
      setLoading(false);
      setInitialLoad(false);
      setCacheStale(isStale);
      
      if (isStale && !showRefreshIndicator) {
        toast.info('Showing cached data. Refreshing...', { duration: 2000 });
      }
    } else if (initialLoad) {
      setLoading(true);
    }
    
    try {
      // Fetch fresh data in background
      const response = await apiWithRetry({
        method: 'get',
        url: `${API}/menu`,
        timeout: 10000
      });
      
      const items = Array.isArray(response.data) ? response.data : [];
      
      setMenuItems(items);
      setCachedItems(items); // Update cache
      setCacheStale(false);
      
      if (items.length === 0 && initialLoad) {
        toast.info('No menu items found. Add your first menu item below!');
      }
      
      if (showRefreshIndicator) {
        toast.success('Menu refreshed successfully!');
      }
      
    } catch (error) {
      // If we have cached data, keep showing it
      if (cachedItems && cachedItems.length > 0) {
        toast.warning('Using cached data. Failed to fetch fresh data.', {
          duration: 3000
        });
        return;
      }
      
      let errorMessage = 'Failed to fetch menu items';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication expired. Please login again.';
        invalidateCache(); // Clear cache on auth error
      } else if (error.response?.status === 403) {
        errorMessage = 'Not authorized to view menu items.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => fetchMenuItems()
        }
      });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [initialLoad]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Store file for retry
    setSelectedFile(file);
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload with compression and progress
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Compress image first
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      
      toast.success(`Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
      
      // Upload with progress tracking
      const { imageUrl, cancel } = await uploadImageWithProgress(
        compressedFile,
        (progress) => setUploadProgress(progress),
        API
      );
      
      setUploadCanceller(() => cancel);
      
      setFormData({ ...formData, image_url: imageUrl });
      setImagePreview(imageUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      if (error.message === 'Upload cancelled') {
        toast.info('Upload cancelled');
      } else {
        toast.error('Failed to upload image', {
          action: {
            label: 'Retry',
            onClick: () => retryImageUpload()
          }
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadCanceller(null);
    }
  };
  
  const retryImageUpload = async () => {
    if (!selectedFile) return;
    
    // Trigger upload with stored file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(selectedFile);
    const event = { target: { files: dataTransfer.files } };
    await handleImageUpload(event);
  };
  
  const cancelImageUpload = () => {
    if (uploadCanceller) {
      uploadCanceller();
      setUploading(false);
      setUploadProgress(0);
      setUploadCanceller(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    const errors = [];
    if (!formData.name || formData.name.trim() === '') {
      errors.push('Item Name is required');
    }
    if (!formData.category || formData.category.trim() === '') {
      errors.push('Category is required');
    }
    if (!formData.price || formData.price <= 0) {
      errors.push('Price must be greater than 0');
    }
    if (formData.preparation_time && formData.preparation_time < 1) {
      errors.push('Preparation time must be at least 1 minute');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors([]), 5000);
      return;
    }
    
    setSubmitting(true);
    
    const submitData = {
      ...formData,
      price: parseFloat(formData.price),
      preparation_time: parseInt(formData.preparation_time) || 15
    };
    
    const operationType = editingItem ? 'update' : 'create';
    const operationId = generateTemporaryId();
    
    try {
      if (editingItem) {
        // UPDATE with optimistic update
        const optimisticItem = { ...editingItem, ...submitData };
        
        // Apply optimistic update
        const operation = applyOptimisticUpdate(
          operationId,
          'update',
          editingItem.id,
          editingItem,
          optimisticItem
        );
        
        setMenuItems(prevItems => 
          prevItems.map(item => item.id === editingItem.id ? optimisticItem : item)
        );
        
        setPendingOperations(prev => new Map(prev).set(operationId, operation));
        setOperationLoading(prev => new Map(prev).set(editingItem.id, 'Updating...'));
        
        // Execute with deduplication
        await executeWithDeduplication(
          `update_${editingItem.id}`,
          async (signal) => {
            const response = await apiWithRetry({
              method: 'put',
              url: `${API}/menu/${editingItem.id}`,
              data: submitData,
              timeout: 10000,
              signal
            });
            
            // Confirm operation
            confirmOperation(operationId);
            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });
            setOperationLoading(prev => {
              const newMap = new Map(prev);
              newMap.delete(editingItem.id);
              return newMap;
            });
            
            // Update with server data
            setMenuItems(prevItems =>
              prevItems.map(item => item.id === editingItem.id ? response.data : item)
            );
            
            // Update cache
            const allItems = await apiWithRetry({
              method: 'get',
              url: `${API}/menu`,
              timeout: 10000
            });
            setCachedItems(allItems.data);
            
            toast.success('Menu item updated successfully!');
          }
        );
      } else {
        // CREATE with optimistic update
        const tempId = generateTemporaryId();
        const optimisticItem = {
          ...submitData,
          id: tempId,
          _optimistic: true,
          _pendingOperationId: operationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Apply optimistic update
        const operation = applyOptimisticUpdate(
          operationId,
          'create',
          tempId,
          null,
          optimisticItem
        );
        
        setMenuItems(prevItems => [...prevItems, optimisticItem]);
        setPendingOperations(prev => new Map(prev).set(operationId, operation));
        setOperationLoading(prev => new Map(prev).set(tempId, 'Creating...'));
        
        // Execute with deduplication
        await executeWithDeduplication(
          `create_${JSON.stringify(submitData)}`,
          async (signal) => {
            const response = await apiWithRetry({
              method: 'post',
              url: `${API}/menu`,
              data: submitData,
              timeout: 10000,
              signal
            });
            
            // Confirm operation and replace temp item with real item
            confirmOperation(operationId);
            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });
            setOperationLoading(prev => {
              const newMap = new Map(prev);
              newMap.delete(tempId);
              return newMap;
            });
            
            setMenuItems(prevItems =>
              prevItems.map(item => item.id === tempId ? response.data : item)
            );
            
            // Update cache
            const allItems = await apiWithRetry({
              method: 'get',
              url: `${API}/menu`,
              timeout: 10000
            });
            setCachedItems(allItems.data);
            
            toast.success('Menu item created successfully!');
          }
        );
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      // Rollback on failure
      rollbackOperation(operationId, error);
      
      if (editingItem) {
        setMenuItems(prevItems =>
          prevItems.map(item => item.id === editingItem.id ? editingItem : item)
        );
      } else {
        setMenuItems(prevItems =>
          prevItems.filter(item => item._pendingOperationId !== operationId)
        );
      }
      
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      setOperationLoading(prev => {
        const newMap = new Map(prev);
        newMap.delete(editingItem?.id || operationId);
        return newMap;
      });
      
      const errorMessage = error.response?.data?.detail || `Failed to ${operationType} menu item`;
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(e)
        }
      });
      
      // Keep form open and preserve data on failure
      setDialogOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    const operationId = generateTemporaryId();
    const itemToDelete = menuItems.find(item => item.id === id);
    
    if (!itemToDelete) return;
    
    try {
      // Apply optimistic update - remove immediately with fade animation
      const operation = applyOptimisticUpdate(
        operationId,
        'delete',
        id,
        itemToDelete,
        null
      );
      
      // Store for undo
      setDeletedItems(prev => new Map(prev).set(id, {
        item: itemToDelete,
        operationId,
        timestamp: Date.now()
      }));
      
      setMenuItems(prevItems => prevItems.filter(item => item.id !== id));
      setPendingOperations(prev => new Map(prev).set(operationId, operation));
      setOperationLoading(prev => new Map(prev).set(id, 'Deleting...'));
      
      // Show undo toast for 3 seconds
      const undoToastId = toast.success('Item deleted', {
        duration: 3000,
        action: {
          label: 'Undo',
          onClick: () => handleUndoDelete(id)
        }
      });
      
      // Wait 3 seconds before actually deleting
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if undo was clicked
      if (!deletedItems.has(id)) {
        return; // Undo was clicked
      }
      
      // Execute delete with deduplication
      await executeWithDeduplication(
        `delete_${id}`,
        async (signal) => {
          await apiWithRetry({
            method: 'delete',
            url: `${API}/menu/${id}`,
            timeout: 10000,
            signal
          });
          
          // Confirm operation
          confirmOperation(operationId);
          setPendingOperations(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });
          setOperationLoading(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
          setDeletedItems(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
          
          // Update cache
          const allItems = await apiWithRetry({
            method: 'get',
            url: `${API}/menu`,
            timeout: 10000
          });
          setCachedItems(allItems.data);
          
          toast.success('Menu item deleted successfully!');
        }
      );
    } catch (error) {
      // Rollback on failure - restore item
      rollbackOperation(operationId, error);
      
      const deletedData = deletedItems.get(id);
      if (deletedData) {
        setMenuItems(prevItems => {
          // Restore to original position
          const newItems = [...prevItems];
          const originalIndex = menuItems.findIndex(item => item.id === id);
          if (originalIndex >= 0) {
            newItems.splice(originalIndex, 0, deletedData.item);
          } else {
            newItems.push(deletedData.item);
          }
          return newItems;
        });
      }
      
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      setOperationLoading(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      setDeletedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      toast.error('Failed to delete menu item', {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => handleDelete(id)
        }
      });
    }
  };
  
  const handleUndoDelete = (id) => {
    const deletedData = deletedItems.get(id);
    if (!deletedData) return;
    
    // Restore item
    setMenuItems(prevItems => {
      const newItems = [...prevItems];
      const originalIndex = menuItems.findIndex(item => item.id === id);
      if (originalIndex >= 0) {
        newItems.splice(originalIndex, 0, deletedData.item);
      } else {
        newItems.push(deletedData.item);
      }
      return newItems;
    });
    
    // Clean up
    setPendingOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(deletedData.operationId);
      return newMap;
    });
    setDeletedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    
    toast.info('Deletion cancelled');
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) return;
    
    try {
      const deletePromises = Array.from(selectedItems).map(id =>
        apiWithRetry({
          method: 'delete',
          url: `${API}/menu/${id}`,
          timeout: 10000
        })
      );
      
      await Promise.all(deletePromises);
      toast.success(`${selectedItems.size} items deleted successfully!`);
      setSelectedItems(new Set());
      setBulkEditMode(false);
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to delete some items');
    }
  };

  const handleBulkAvailabilityToggle = async (available) => {
    if (selectedItems.size === 0) return;
    
    try {
      const updatePromises = Array.from(selectedItems).map(id => {
        const item = menuItems.find(item => item.id === id);
        return apiWithRetry({
          method: 'put',
          url: `${API}/menu/${id}`,
          data: { ...item, available },
          timeout: 10000
        });
      });
      
      await Promise.all(updatePromises);
      toast.success(`${selectedItems.size} items updated successfully!`);
      setSelectedItems(new Set());
      setBulkEditMode(false);
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to update some items');
    }
  };

  const bulkFields = ['name', 'category', 'price', 'preparation_time', 'available', 'is_popular', 'is_vegetarian', 'is_spicy', 'allergens'];
  const normalizeBulkItem = (item) => Object.fromEntries(bulkFields.map(field => {
    let value = item[field] ?? (field === 'allergens' ? '' : field === 'preparation_time' ? 15 : '');
    if (['price', 'preparation_time'].includes(field)) value = value === '' ? '' : Number(value);
    if (['available', 'is_popular', 'is_vegetarian', 'is_spicy'].includes(field)) value = Boolean(value);
    return [field, value];
  }));
  const bulkChanged = (id) => bulkFields.some(field => normalizeBulkItem(bulkDrafts[id] || {})[field] !== normalizeBulkItem(bulkOriginals[id] || {})[field]);

  const openBulkUpdate = () => {
    const originals = Object.fromEntries(menuItems.map(item => [item.id, normalizeBulkItem(item)]));
    setBulkOriginals(originals);
    setBulkDrafts(Object.fromEntries(menuItems.map(item => [item.id, { ...item, ...normalizeBulkItem(item) }])));
    setBulkFailedIds([]);
    setBulkUpdateErrors([]);
    setBulkUpdateOpen(true);
  };

  const updateBulkDraft = (id, field, value) => {
    setBulkDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setBulkUpdateErrors([]);
  };

  const applyBulkUpdate = async () => {
    if (bulkUpdating) return;
    const changed = Object.values(bulkDrafts).filter(item => bulkChanged(item.id));
    const errors = changed.flatMap(item => [
      Number(item.price) < 0 ? `${item.name}: price cannot be negative.` : null,
      Number(item.preparation_time) < 0 || !Number.isInteger(Number(item.preparation_time)) ? `${item.name}: preparation time must be whole minutes.` : null,
      !String(item.name).trim() ? `${item.id}: every item needs a name.` : null
    ].filter(Boolean));
    if (errors.length) { setBulkUpdateErrors(errors); return; }
    if (!changed.length) { setBulkUpdateErrors(['Make at least one change before saving.']); return; }
    const controller = new AbortController();
    bulkAbortRef.current = controller;
    const operationId = generateTemporaryId();
    setBulkOperation({ id: operationId, total: changed.length, completed: 0 });
    setBulkFailedIds([]); setBulkUpdating(true); setBulkUpdateErrors([]);
    const results = [];
    for (let index = 0; index < changed.length; index += 4) {
      if (controller.signal.aborted) break;
      const batch = changed.slice(index, index + 4);
      const batchResults = await Promise.all(batch.map(async item => {
        try {
          const response = await apiWithRetry({ method: 'put', url: `${API}/menu/${item.id}`, data: normalizeBulkItem(item), timeout: 10000, signal: controller.signal });
          return { id: item.id, ok: true, data: response.data };
        } catch (error) { return { id: item.id, ok: false, error: error.message || 'Request failed' }; }
      }));
      results.push(...batchResults);
      setBulkOperation(prev => prev && ({ ...prev, completed: Math.min(prev.total, index + batch.length) }));
    }
    const failed = results.filter(result => !result.ok);
    const succeeded = results.filter(result => result.ok);
    setMenuItems(prev => prev.map(item => succeeded.find(result => result.id === item.id)?.data || item));
    setBulkFailedIds(failed.map(result => result.id));
    if (succeeded.length) setBulkOriginals(prev => ({ ...prev, ...Object.fromEntries(succeeded.map(result => [result.id, normalizeBulkItem(result.data)])) }));
    if (failed.length) setBulkUpdateErrors(failed.map(result => `${bulkDrafts[result.id]?.name || result.id}: ${result.error}`));
    else { toast.success(`${succeeded.length} menu item${succeeded.length === 1 ? '' : 's'} updated.`); setBulkUpdateOpen(false); setSelectedItems(new Set()); setBulkEditMode(false); }
    setBulkUpdating(false); setBulkOperation(null); bulkAbortRef.current = null;
  };

  const cancelBulkUpdate = () => { bulkAbortRef.current?.abort(); setBulkUpdating(false); setBulkOperation(null); };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      description: '',
      image_url: '',
      available: true,
      preparation_time: 15,
      is_popular: false,
      is_vegetarian: false,
      is_spicy: false,
      allergens: ''
    });
    setEditingItem(null);
    setImagePreview('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadCanceller(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || '',
      image_url: item.image_url || '',
      available: item.available,
      preparation_time: item.preparation_time || 15,
      is_popular: item.is_popular || false,
      is_vegetarian: item.is_vegetarian || false,
      is_spicy: item.is_spicy || false,
      allergens: item.allergens || ''
    });
    setImagePreview(item.image_url || '');
    setDialogOpen(true);
  };

  // Quick actions with optimistic updates
  const toggleItemAvailability = async (item) => {
    const operationId = generateTemporaryId();
    const optimisticItem = { ...item, available: !item.available };
    
    try {
      // Apply optimistic update
      const operation = applyOptimisticUpdate(
        operationId,
        'toggle_availability',
        item.id,
        item,
        optimisticItem
      );
      
      setMenuItems(prevItems =>
        prevItems.map(i => i.id === item.id ? optimisticItem : i)
      );
      setPendingOperations(prev => new Map(prev).set(operationId, operation));
      setOperationLoading(prev => new Map(prev).set(item.id, 'Updating...'));
      
      // Execute with deduplication
      await executeWithDeduplication(
        `toggle_availability_${item.id}`,
        async (signal) => {
          const response = await apiWithRetry({
            method: 'put',
            url: `${API}/menu/${item.id}`,
            data: optimisticItem,
            timeout: 10000,
            signal
          });
          
          // Confirm operation
          confirmOperation(operationId);
          setPendingOperations(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });
          setOperationLoading(prev => {
            const newMap = new Map(prev);
            newMap.delete(item.id);
            return newMap;
          });
          
          setMenuItems(prevItems =>
            prevItems.map(i => i.id === item.id ? response.data : i)
          );
          
          // Update cache
          const allItems = await apiWithRetry({
            method: 'get',
            url: `${API}/menu`,
            timeout: 10000
          });
          setCachedItems(allItems.data);
          
          toast.success(`${item.name} is now ${!item.available ? 'available' : 'unavailable'}`);
        }
      );
    } catch (error) {
      // Rollback on failure
      rollbackOperation(operationId, error);
      
      setMenuItems(prevItems =>
        prevItems.map(i => i.id === item.id ? item : i)
      );
      
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      setOperationLoading(prev => {
        const newMap = new Map(prev);
        newMap.delete(item.id);
        return newMap;
      });
      
      toast.error('Failed to update item availability', {
        action: {
          label: 'Retry',
          onClick: () => toggleItemAvailability(item)
        }
      });
    }
  };

  const toggleItemPopularity = async (item) => {
    const operationId = generateTemporaryId();
    const optimisticItem = { ...item, is_popular: !item.is_popular };
    
    try {
      // Apply optimistic update
      const operation = applyOptimisticUpdate(
        operationId,
        'toggle_popularity',
        item.id,
        item,
        optimisticItem
      );
      
      setMenuItems(prevItems =>
        prevItems.map(i => i.id === item.id ? optimisticItem : i)
      );
      setPendingOperations(prev => new Map(prev).set(operationId, operation));
      setOperationLoading(prev => new Map(prev).set(item.id, 'Updating...'));
      
      // Execute with deduplication
      await executeWithDeduplication(
        `toggle_popularity_${item.id}`,
        async (signal) => {
          const response = await apiWithRetry({
            method: 'put',
            url: `${API}/menu/${item.id}`,
            data: optimisticItem,
            timeout: 10000,
            signal
          });
          
          // Confirm operation
          confirmOperation(operationId);
          setPendingOperations(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });
          setOperationLoading(prev => {
            const newMap = new Map(prev);
            newMap.delete(item.id);
            return newMap;
          });
          
          setMenuItems(prevItems =>
            prevItems.map(i => i.id === item.id ? response.data : i)
          );
          
          // Update cache
          const allItems = await apiWithRetry({
            method: 'get',
            url: `${API}/menu`,
            timeout: 10000
          });
          setCachedItems(allItems.data);
          
          toast.success(`${item.name} ${!item.is_popular ? 'marked as popular' : 'removed from popular'}`);
        }
      );
    } catch (error) {
      // Rollback on failure
      rollbackOperation(operationId, error);
      
      setMenuItems(prevItems =>
        prevItems.map(i => i.id === item.id ? item : i)
      );
      
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      setOperationLoading(prev => {
        const newMap = new Map(prev);
        newMap.delete(item.id);
        return newMap;
      });
      
      toast.error('Failed to update item popularity', {
        action: {
          label: 'Retry',
          onClick: () => toggleItemPopularity(item)
        }
      });
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
      </div>
      
      {/* Search skeleton */}
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-6"></div>
      </div>
      
      {/* Menu items skeleton */}
      {[1, 2, 3].map(category => (
        <div key={category} className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(item => (
              <div key={item} className="bg-white rounded-lg border p-4">
                <div className="h-40 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Enhanced menu item component with more features
  const MenuItemCard = useCallback(({ item, isSelected, onSelect }) => {
    const isPending = item._optimistic || operationLoading.has(item.id);
    const loadingMessage = operationLoading.get(item.id);
    
    return (
      <Card 
        key={item.id} 
        className={`card-hover border-0 shadow-lg transition-all duration-200 relative ${
          !item.available ? 'opacity-60' : ''
        } ${isSelected ? 'ring-2 ring-violet-500' : ''} ${
          viewMode === 'list' ? 'flex-row' : ''
        } ${isPending ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`} 
        data-testid={`menu-item-${item.id}`}
      >
        {/* Pending indicator */}
        {isPending && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {loadingMessage || 'Pending...'}
            </div>
          </div>
        )}
        
        {/* Bulk edit checkbox */}
        {bulkEditMode && (
          <div className={`absolute ${isPending ? 'top-10' : 'top-2'} left-2 z-10`}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(item.id)}
              className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
            />
          </div>
        )}

        {/* Popular badge */}
        {item.is_popular && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Star className="w-3 h-3" />
              Popular
            </div>
          </div>
        )}

        <div className={`${viewMode === 'list' ? 'flex w-full' : ''}`}>
          {/* Image section */}
          {item.image_url && (
            <div className={`overflow-hidden ${
              viewMode === 'list' 
                ? 'w-32 h-32 rounded-l-lg flex-shrink-0' 
                : 'h-40 rounded-t-lg'
            }`}>
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-200 hover:scale-105" 
                onError={(e) => e.target.style.display = 'none'}
                loading="lazy"
              />
            </div>
          )}

          {/* Content section */}
          <div className={`${viewMode === 'list' ? 'flex-1 flex flex-col' : ''}`}>
            <CardHeader className={`${viewMode === 'list' ? 'pb-2 flex-shrink-0' : 'pb-2'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className={`${viewMode === 'list' ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
                    {item.name}
                    {item.is_vegetarian && <span className="text-green-600 text-sm">🌱</span>}
                    {item.is_spicy && <span className="text-red-600 text-sm">🌶️</span>}
                  </CardTitle>
                  <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                  {item.preparation_time && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {item.preparation_time} mins
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`${viewMode === 'list' ? 'text-lg' : 'text-lg'} font-bold text-violet-600`}>
                    ₹{item.price}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className={`${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
              <div>
                {item.description && (
                  <p className={`text-sm text-gray-600 mb-3 ${
                    viewMode === 'list' ? 'line-clamp-2' : 'line-clamp-2'
                  }`}>
                    {item.description}
                  </p>
                )}
                
                {item.allergens && (
                  <p className="text-xs text-orange-600 mb-2">
                    <strong>Allergens:</strong> {item.allergens}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>

                {['admin', 'cashier'].includes(user?.role) && (
                  <div className="flex gap-1">
                    {/* Quick availability toggle */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => toggleItemAvailability(item)}
                      className="p-1 h-8 w-8"
                      title={`Mark as ${item.available ? 'unavailable' : 'available'}`}
                      disabled={isPending}
                    >
                      {item.available ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>

                    {/* Quick popularity toggle */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => toggleItemPopularity(item)}
                      className={`p-1 h-8 w-8 ${item.is_popular ? 'bg-yellow-100 text-yellow-700' : ''}`}
                      title={`${item.is_popular ? 'Remove from' : 'Mark as'} popular`}
                      disabled={isPending}
                    >
                      <Star className="w-3 h-3" />
                    </Button>

                    {/* Edit button */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(item)} 
                      className="p-1 h-8 w-8"
                      data-testid={`edit-menu-${item.id}`}
                      disabled={isPending}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>

                    {/* Delete button - admin only */}
                    {user?.role === 'admin' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 p-1 h-8 w-8" 
                        onClick={() => handleDelete(item.id)} 
                        data-testid={`delete-menu-${item.id}`}
                        disabled={isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    );
  }, [user?.role, viewMode, bulkEditMode, operationLoading]);

  // Stats cards component
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <Grid className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-xl font-bold">{menuStats.total}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Available</p>
            <p className="text-xl font-bold">{menuStats.available}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Popular</p>
            <p className="text-xl font-bold">{menuStats.popular}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Price</p>
            <p className="text-xl font-bold">₹{menuStats.avgPrice}</p>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <Layout user={user}>
      <ValidationAlert errors={validationErrors} onClose={() => setValidationErrors([])} />
      <div className="space-y-6" data-testid="menu-page">
        <TrialBanner user={user} />
        
        {/* Header with enhanced actions */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Menu Management</h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              Manage your restaurant menu items • {menuStats.total} items total
              {cacheStale && (
                <span className="text-orange-600 text-sm flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Cache stale
                </span>
              )}
              {backgroundSyncing && (
                <span className="text-blue-600 text-sm flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Syncing...
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Refresh button */}
            <Button 
              variant="outline" 
              onClick={() => fetchMenuItems(true)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/counter-sale')}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Counter Sale
            </Button>

            {/* Bulk update entry point */}
            {menuItems.length > 0 && (
              <Button
                variant={bulkEditMode ? "default" : "outline"}
                onClick={() => {
                  setBulkEditMode(!bulkEditMode);
                  setSelectedItems(new Set());
                }}
                className={bulkEditMode ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'}
                data-testid="bulk-edit-toggle"
                title="Select multiple items and update their details together"
              >
                <Edit className="w-4 h-4 mr-2" />
                {bulkEditMode ? 'Done selecting' : 'Bulk Update'}
              </Button>
            )}

            {/* Add menu item button */}
            {['admin', 'cashier'].includes(user?.role) && (
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-600 to-purple-600" data-testid="add-menu-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Menu Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="menu-dialog">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          data-testid="menu-name-input"
                        />
                      </div>
                      <div>
                        <Label>Category *</Label>
                        <Input
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          required
                          data-testid="menu-category-input"
                        />
                      </div>
                      <div>
                        <Label>Price (₹) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          data-testid="menu-price-input"
                        />
                      </div>
                      <div>
                        <Label>Prep Time (mins)</Label>
                        <Input
                          type="number"
                          value={formData.preparation_time}
                          onChange={(e) => setFormData({ ...formData, preparation_time: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        data-testid="menu-description-input"
                      />
                    </div>

                    <div>
                      <Label>Allergens (comma separated)</Label>
                      <Input
                        value={formData.allergens}
                        onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                        placeholder="nuts, dairy, gluten"
                      />
                    </div>
                    
                    <div>
                      <Label>Menu Image</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex-1"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Upload Image'}
                          </Button>
                          {uploading && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelImageUpload}
                              className="text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                        
                        {/* Upload progress bar */}
                        {uploading && (
                          <div className="space-y-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 text-center">{uploadProgress}% uploaded</p>
                          </div>
                        )}
                        
                        {imagePreview && (
                          <div className="relative">
                            <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => {
                                setImagePreview('');
                                setFormData({ ...formData, image_url: '' });
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">Or enter image URL below (optional)</p>
                        <Input
                          value={formData.image_url}
                          onChange={(e) => {
                            setFormData({ ...formData, image_url: e.target.value });
                            setImagePreview(e.target.value);
                          }}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                    
                    {/* Enhanced checkboxes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="available"
                          checked={formData.available}
                          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="available" className="cursor-pointer">Available</Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="popular"
                          checked={formData.is_popular}
                          onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="popular" className="cursor-pointer">Popular</Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="vegetarian"
                          checked={formData.is_vegetarian}
                          onChange={(e) => setFormData({ ...formData, is_vegetarian: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="vegetarian" className="cursor-pointer">Vegetarian</Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="spicy"
                          checked={formData.is_spicy}
                          onChange={(e) => setFormData({ ...formData, is_spicy: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="spicy" className="cursor-pointer">Spicy</Label>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600" 
                        data-testid="save-menu-button"
                        disabled={submitting || uploading}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {editingItem ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingItem ? 'Update' : 'Create'
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <StatsCards />

        {/* Enhanced search and filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="menu-search-input"
              />
            </div>
            
            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Filters toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-violet-100 text-violet-700' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Category</Label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label} ({cat.count})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Sort By</Label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="category">Category</option>
                    <option value="popularity">Popularity</option>
                    <option value="created">Date Added</option>
                  </select>
                </div>
                
                <div>
                  <Label>Price Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Label>Options</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="availableOnly"
                      checked={showAvailableOnly}
                      onChange={(e) => setShowAvailableOnly(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="availableOnly" className="cursor-pointer text-sm">Available only</Label>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSortBy('name');
                      setSortOrder('asc');
                      setShowAvailableOnly(false);
                      setPriceRange({ min: '', max: '' });
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Bulk edit actions */}
        {bulkEditMode && (
          <Card className="p-4 bg-violet-50 border-violet-200">
            <div className="flex min-w-0 items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="font-medium">{selectedItems.size ? `${selectedItems.size} items selected` : 'Edit all menu items in one table'}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const visibleIds = filteredAndSortedItems.map(item => item.id);
                    setSelectedItems(new Set(visibleIds));
                  }}
                >
                  Select all visible
                </Button>
                {selectedItems.size > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0 bg-violet-600 font-semibold text-white shadow-sm hover:bg-violet-700"
                  onClick={openBulkUpdate}
                  data-testid="bulk-update-button"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Bulk Update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAvailabilityToggle(true)}
                >
                  Mark Available
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAvailabilityToggle(false)}
                >
                  Mark Unavailable
                </Button>
                {user?.role === 'admin' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        <Dialog open={bulkUpdateOpen} onOpenChange={(open) => { if (!bulkUpdating) setBulkUpdateOpen(open); }}>
          <DialogContent className="flex h-[92vh] w-[calc(100vw-2rem)] max-w-[1500px] flex-col gap-0 overflow-hidden border-violet-200 p-0" data-testid="bulk-update-workspace">
            <DialogHeader className="shrink-0 border-b bg-background px-6 py-4">
              <DialogTitle>Edit menu items</DialogTitle>
            </DialogHeader>
            <Card className="flex min-h-0 flex-1 flex-col border-0 shadow-none">
            <CardHeader className="shrink-0 border-b bg-background px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Edit menu items</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Click any cell to change it. Use the category dropdown to update a whole group quickly.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>{Object.values(bulkDrafts).length} items</span><span aria-hidden="true">•</span><span>{Object.values(bulkDrafts).filter(item => bulkChanged(item.id)).length} changed</span></div>
              </div>
              <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/50 p-3">
                <div className="min-w-48"><Label htmlFor="bulk-category-filter">Show category</Label><select id="bulk-category-filter" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">{categories.map(category => <option key={category.value} value={category.value}>{category.label} ({category.count})</option>)}</select></div>
                <div className="min-w-48"><Label htmlFor="apply-category">Apply category to all</Label><select id="apply-category" defaultValue="" onChange={e => { if (e.target.value) Array.from(selectedItems).forEach(id => updateBulkDraft(id, 'category', e.target.value)); e.target.value = ''; }} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Choose category...</option>{categories.filter(category => category.value !== 'all').map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
                <Button type="button" variant="outline" onClick={() => { const visibleIds = filteredAndSortedItems.map(item => item.id); setBulkDrafts(prev => Object.fromEntries(Object.entries(prev).map(([id, item]) => visibleIds.includes(Number(id)) || visibleIds.includes(id) ? [id, { ...item, available: true }] : [id, item]))); }}>Make visible available</Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto p-0">
              {bulkOperation && <div className="border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground" role="status">Saving {bulkOperation.completed} of {bulkOperation.total} items…</div>}
              {bulkFailedIds.length > 0 && <div className="m-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{bulkFailedIds.length} item{bulkFailedIds.length === 1 ? '' : 's'} failed. Edit them and save again.</div>}
              {bulkUpdateErrors.length > 0 && <div className="m-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{bulkUpdateErrors.map(error => <p key={error}>{error}</p>)}</div>}
              <div className="min-w-0 overflow-auto"><table className="min-w-[1240px] w-full text-sm"><thead className="sticky top-0 z-[1] bg-muted"><tr>{['Select','Item name','Category','Price','Prep time','Available','Popular','Vegetarian','Spicy','Allergens'].map(label => <th key={label} className="whitespace-nowrap px-3 py-3 text-left font-semibold">{label}</th>)}</tr></thead><tbody>{filteredAndSortedItems.map(item => bulkDrafts[item.id]).filter(Boolean).map(item => <tr key={item.id} className="border-t hover:bg-muted/40"><td className="w-12 px-3 py-2"><input type="checkbox" aria-label={`Select ${item.name}`} checked={selectedItems.has(item.id)} onChange={() => setSelectedItems(prev => { const next = new Set(prev); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} /></td><td className="min-w-64 px-3 py-2"><Input aria-label={`${item.name} item name`} value={item.name} onChange={e => updateBulkDraft(item.id, 'name', e.target.value)} /></td><td className="min-w-52 px-3 py-2"><select aria-label={`${item.name} category`} value={item.category} onChange={e => updateBulkDraft(item.id, 'category', e.target.value)} className="w-full rounded-md border bg-background px-2 py-2">{categories.filter(category => category.value !== 'all').map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></td><td className="w-28 px-3 py-2"><Input type="number" min="0" step="0.01" value={item.price} onChange={e => updateBulkDraft(item.id, 'price', e.target.value)} /></td><td className="w-28 px-3 py-2"><Input type="number" min="0" step="1" value={item.preparation_time} onChange={e => updateBulkDraft(item.id, 'preparation_time', e.target.value)} /></td>{['available','is_popular','is_vegetarian','is_spicy'].map(field => <td key={field} className="w-32 px-3 py-2"><select aria-label={`${item.name} ${field}`} value={String(Boolean(item[field]))} onChange={e => updateBulkDraft(item.id, field, e.target.value === 'true')} className="w-full rounded-md border bg-background px-2 py-2"><option value="true">Yes</option><option value="false">No</option></select></td>)}<td className="min-w-56 px-3 py-2"><Input value={item.allergens} placeholder="None" onChange={e => updateBulkDraft(item.id, 'allergens', e.target.value)} /></td></tr>)}</tbody></table></div>
            </CardContent>
            <div className="shrink-0 border-t bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Edit cells, then save once. Scroll inside the table to see every column.</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={bulkUpdating} onClick={() => { cancelBulkUpdate(); setBulkUpdateOpen(false); }}>Cancel</Button><Button type="button" disabled={bulkUpdating} onClick={applyBulkUpdate} data-testid="bulk-update-apply-button">{bulkUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save changes'}</Button></div></div></div>
            </Card>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Component */}
        {['admin', 'manager'].includes(user?.role) && (
          <BulkUpload 
            type="menu" 
            onSuccess={async () => {
              // Force fresh fetch after CSV upload (cache already invalidated in BulkUpload)
              await fetchMenuItems(false);
            }}
          />
        )}

        {/* Show loading skeleton only on initial load */}
        {loading && initialLoad ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Show loading indicator for subsequent loads */}
            {loading && !initialLoad && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-sm text-gray-600">Refreshing...</span>
              </div>
            )}
            
            {/* Render items based on view mode */}
            {viewMode === 'grid' ? (
              // Grid view - grouped by category
              categories.map((category) => {
                const categoryItems = categoryItemsMap[category.value];
                if (!categoryItems || categoryItems.length === 0) return null;

                return (
                  <div key={category.value} className="space-y-4">
                    <h2 className="text-2xl font-bold capitalize text-gray-800 flex items-center gap-2">
                      {category.label}
                      <span className="text-sm font-normal text-gray-500">({category.count})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryItems.map((item) => (
                        <MenuItemCard 
                          key={item.id} 
                          item={item}
                          isSelected={selectedItems.has(item.id)}
                          onSelect={(id) => {
                            const newSelected = new Set(selectedItems);
                            if (newSelected.has(id)) {
                              newSelected.delete(id);
                            } else {
                              newSelected.add(id);
                            }
                            setSelectedItems(newSelected);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // List view - all items in a single list
              <div className="space-y-3">
                {filteredAndSortedItems.map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={(id) => {
                      const newSelected = new Set(selectedItems);
                      if (newSelected.has(id)) {
                        newSelected.delete(id);
                      } else {
                        newSelected.add(id);
                      }
                      setSelectedItems(newSelected);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && filteredAndSortedItems.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg mb-2">
                  {searchTerm || selectedCategory !== 'all' || showAvailableOnly || priceRange.min || priceRange.max
                    ? 'No menu items match your filters' 
                    : 'No menu items found'}
                </p>
                {!searchTerm && selectedCategory === 'all' && !showAvailableOnly && !priceRange.min && !priceRange.max && (
                  <p className="text-gray-400 text-sm">Add your first menu item to get started</p>
                )}
                {(searchTerm || selectedCategory !== 'all' || showAvailableOnly || priceRange.min || priceRange.max) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                      setShowAvailableOnly(false);
                      setPriceRange({ min: '', max: '' });
                    }}
                    className="mt-4"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default MenuPage;
