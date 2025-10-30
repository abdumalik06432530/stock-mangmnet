import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AccessoriesPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [newAccessory, setNewAccessory] = useState({ model: '', quantity: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`/api/product/${productId}`);
        setProduct(res.data);
        setAccessories(res.data.accessories || []);
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleAddAccessory = async () => {
    if (!newAccessory.model) return;
    try {
      const res = await axios.post(`/api/product/${productId}/accessory`, newAccessory);
      setAccessories([...accessories, res.data]);
      setNewAccessory({ model: '', quantity: 0 });
    } catch (err) {
      // handle error
    }
  };

  const handleEditAccessory = async (index, updated) => {
    try {
      const res = await axios.put(`/api/product/${productId}/accessory/${accessories[index]._id}`, updated);
      const updatedAccessories = [...accessories];
      updatedAccessories[index] = res.data;
      setAccessories(updatedAccessories);
    } catch (err) {
      // handle error
    }
  };

  const handleDeleteAccessory = async (index) => {
    try {
      await axios.delete(`/api/product/${productId}/accessory/${accessories[index]._id}`);
      setAccessories(accessories.filter((_, i) => i !== index));
    } catch (err) {
      // handle error
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <h2>Accessories for {product.model}</h2>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accessories.map((acc, idx) => (
            <tr key={acc._id || idx}>
              <td>
                <input
                  value={acc.model}
                  onChange={e => handleEditAccessory(idx, { ...acc, model: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={acc.quantity}
                  onChange={e => handleEditAccessory(idx, { ...acc, quantity: Number(e.target.value) })}
                />
              </td>
              <td>
                <button onClick={() => handleDeleteAccessory(idx)}>Delete</button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input
                value={newAccessory.model}
                onChange={e => setNewAccessory({ ...newAccessory, model: e.target.value })}
                placeholder="Accessory Model"
              />
            </td>
            <td>
              <input
                type="number"
                value={newAccessory.quantity}
                onChange={e => setNewAccessory({ ...newAccessory, quantity: Number(e.target.value) })}
                placeholder="Quantity"
              />
            </td>
            <td>
              <button onClick={handleAddAccessory}>Add</button>
            </td>
          </tr>
        </tbody>
      </table>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>
  );
};

export default AccessoriesPage;
