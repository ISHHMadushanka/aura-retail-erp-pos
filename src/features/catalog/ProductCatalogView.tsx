import React, { useState } from 'react';
import {
  Package, Search, Plus, Edit2, Tag, Barcode, AlertTriangle, Check, X
} from 'lucide-react';
import { db } from '../../services/db/store';
import { Product, Category } from '../../types/erp';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AuditService } from '../../services/auditService';

export const ProductCatalogView: React.FC = () => {
  const { currentUser, hasPermission, activeBranch } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    departmentId: 'cat_fresh',
    categoryId: 'cat_fresh',
    brand: '',
    unit: 'PCS',
    costPrice: 0,
    sellingPrice: 0,
    minSellingPrice: 0,
    taxRate: 0,
    reorderLevel: 10,
    maxStock: 100,
    isWeighable: false,
    trackBatches: false,
    isActive: true
  });

  const products = db.collection('products').find();
  const categories = db.collection('categories').find();

  const filtered = products.filter((p: Product) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    const matchesCat = selectedCat === 'ALL' || p.departmentId === selectedCat || p.categoryId === selectedCat;
    return matchesSearch && matchesCat;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: 'SKU-' + Date.now().toString().slice(-4),
      barcode: '479' + Math.floor(1000000000 + Math.random() * 9000000000),
      additionalBarcodes: [],
      departmentId: categories[0]?.id || 'cat_fresh',
      categoryId: categories[0]?.id || 'cat_fresh',
      brand: 'Aura Select',
      unit: 'PCS',
      costPrice: 100,
      sellingPrice: 150,
      minSellingPrice: 140,
      taxRate: 0,
      reorderLevel: 15,
      maxStock: 200,
      isWeighable: false,
      trackBatches: false,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.barcode) {
      notifyError('Validation Failed', 'Name, SKU, and Barcode are required');
      return;
    }

    if (editingProduct) {
      // Update
      db.collection('products').updateOne(
        (p: Product) => p.id === editingProduct.id,
        formData
      );
      AuditService.log(
        currentUser,
        'PRODUCT_UPDATED',
        'CATALOG',
        editingProduct.id,
        editingProduct,
        formData,
        activeBranch.id
      );
      success('Product Updated', `${formData.name} updated successfully.`);
    } else {
      // Insert
      const newProduct: Product = {
        id: 'prod_' + Math.random().toString(36).substr(2, 9),
        companyId: currentUser.companyId,
        sku: formData.sku!,
        barcode: formData.barcode!,
        additionalBarcodes: formData.additionalBarcodes || [],
        name: formData.name!,
        description: formData.description || '',
        departmentId: formData.departmentId!,
        categoryId: formData.categoryId!,
        brand: formData.brand || 'General',
        unit: formData.unit as any || 'PCS',
        isWeighable: Boolean(formData.isWeighable),
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        wholesalePrice: formData.wholesalePrice ? Number(formData.wholesalePrice) : undefined,
        minSellingPrice: Number(formData.minSellingPrice) || 0,
        taxRate: Number(formData.taxRate) || 0,
        reorderLevel: Number(formData.reorderLevel) || 10,
        maxStock: Number(formData.maxStock) || 100,
        trackBatches: Boolean(formData.trackBatches),
        isActive: true
      };

      db.collection('products').insertOne(newProduct);
      AuditService.log(
        currentUser,
        'PRODUCT_CREATED',
        'CATALOG',
        newProduct.id,
        null,
        newProduct,
        activeBranch.id
      );
      success('Product Created', `${newProduct.name} added to catalog.`);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" />
            Product Catalog & Master Data
          </h2>
          <p className="text-xs text-slate-400">
            Manage SKUs, barcodes, multi-tier pricing, units of measurement, and category hierarchies
          </p>
        </div>

        {hasPermission('catalog.create') && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-96 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by product name, barcode, or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Tag className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 py-1.5 px-3 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c: Category) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name & Brand</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">UOM</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Tax %</th>
                <th className="py-3 px-3 text-center">Reorder Lvl</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filtered.map((prod: Product) => {
                const cat = categories.find((c: Category) => c.id === prod.departmentId);
                return (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white text-xs">{prod.name}</div>
                      <div className="text-[10px] text-slate-400">{prod.brand}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-emerald-400">{prod.sku}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Barcode className="w-3 h-3" /> {prod.barcode}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 border border-slate-700">
                        {cat ? cat.name : 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-200">{prod.unit}</span>
                      {prod.isWeighable && (
                        <span className="ml-1 text-[9px] bg-blue-950 text-blue-300 px-1 rounded font-sans">
                          Scale
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">Rs. {prod.costPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      Rs. {prod.sellingPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">{(prod.taxRate * 100).toFixed(0)}%</td>
                    <td className="py-3 px-3 text-center">{prod.reorderLevel}</td>
                    <td className="py-3 px-4 text-center">
                      {hasPermission('catalog.update') && (
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 text-slate-100">
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">
                {editingProduct ? 'Edit Product Master' : 'Create New Product Master'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Primary Barcode (EAN-13 / UPC) *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Department / Category *</label>
                  <select
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value, categoryId: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  >
                    {categories.map((c: Category) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Brand Name</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Unit of Measurement</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="G">G (Grams)</option>
                    <option value="L">L (Liters)</option>
                    <option value="PACK">PACK</option>
                    <option value="BOTTLE">BOTTLE</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Retail Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-emerald-400 font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Minimum Selling Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minSellingPrice}
                    onChange={e => setFormData({ ...formData, minSellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">VAT / Tax Rate (e.g. 0.08 for 8%)</label>
                  <input
                    type="number"
                    step="0.005"
                    value={formData.taxRate}
                    onChange={e => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Reorder Threshold Level</label>
                  <input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={e => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 10 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-6 sm:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.isWeighable}
                      onChange={e => setFormData({ ...formData, isWeighable: e.target.checked })}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Weighable Item (Electronic Scale Barcodes)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.trackBatches}
                      onChange={e => setFormData({ ...formData, trackBatches: e.target.checked })}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Track Batches & Expiry Dates</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
