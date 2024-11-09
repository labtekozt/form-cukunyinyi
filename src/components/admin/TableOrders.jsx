import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ORDERS_PATH } from '../../constant/apiPath';

const TableOrder = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [isRepostingId, setIsRepostingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: '/order' } });
      return false;
    }
    return token;
  };

  const fetchTableOrder = async () => {
    try {
      const token = checkAuth();
      if (!token) return;

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          page: searchParams.get('page') || 1,
          perPage: searchParams.get('perPage') || 10,
          touristType: searchParams.get('touristType'),
          sort: searchParams.get('sort'),
          order: searchParams.get('order'),
        },
      };

      const response = await axios.get(ORDERS_PATH.INDEX, config);

      if (response.data.success === false) {
        throw new Error(response.data.message || 'Failed to fetch orders');
      }

      setOrderData(response.data.data);
      setPagination(response.data.pagination);
      setCurrentPage(parseInt(searchParams.get('page') || '1', 10));
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { state: { from: '/order' } });
      } else {
        const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableOrder();
  }, [navigate, searchParams]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { state: { from: '/order' } });
        return;
      }

      setIsDeletingId(orderId);
      setError(null);

      setOrderData(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
      }));

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      await axios.delete(`${ORDERS_PATH.INDEX}/${orderId}`, config);
      alert('Order berhasil dihapus');
    } catch (err) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(ORDERS_PATH.INDEX, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              page: currentPage,
              perPage: pagination.perPage,
              touristType: searchParams.get('touristType'),
              sort: searchParams.get('sort'),
              order: searchParams.get('order'),
            },
          });
          setOrderData(response.data.data);
          setPagination(response.data.pagination);
        } catch {
          setError('Failed to recover data after delete error');
        }
      }
      setError(err.response?.data?.message || err.message || 'Gagal menghapus order');
      alert('Gagal menghapus order');
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredData = useMemo(() => {
    return orderData.filter((order) =>
      order.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orderData, searchTerm]);

  const handleRepost = async (order) => {
    if (!window.confirm('Are you sure you want to repost this order?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { state: { from: '/order' } });
        return;
      }

      setIsRepostingId(order.id);
      setError(null);

      const currentDate = new Date().toISOString().split('T')[0];
      const repostData = {
        date: currentDate,
        purpose: order.purpose,
        touristType: order.touristType,
        touristGroupType: order.touristGroupType,
        touristCount: order.touristCount,
        paymentType: order.paymentType,
        paymentProof: order.paymentType === 'tunai' ? 'Pembayaran Tunai' : order.paymentProof,
        userInformation: order.userInformation,
      };

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.post(ORDERS_PATH.INDEX, repostData, config);

      const newOrder = {
        ...response.data.data,
        id: response.data.data.id,
      };

      setOrderData(prevOrders => [newOrder, ...prevOrders]);
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1,
      }));

      alert('Order berhasil direpost');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to repost order');
      alert('Gagal merepost order');
    } finally {
      setIsRepostingId(null);
    }
  };

  const handlePreviousPage = () => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    if (page > 1) {
      setSearchParams({ page: page - 1 });
    }
  };

  const handleNextPage = () => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const totalPages = Math.ceil(pagination.total / pagination.perPage);
    if (page < totalPages) {
      setSearchParams({ page: page + 1 });
    }
  };

  const handleFilter = (filter) => {
    const params = new URLSearchParams(searchParams);
    Object.keys(filter).forEach(key => {
      if (filter[key]) {
        params.set(key, filter[key]);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (orderData.length === 0 && currentPage === 1) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-gray-600">No orders found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Manajemen Order</h1>
      <div className="bg-white rounded-lg p-2">
        {/* Filter and Search section */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-x-2">
            <label htmlFor="touristType" className="text-gray-700">Tourist Type:</label>
            <select
              id="touristType"
              value={searchParams.get('touristType') || ''}
              onChange={(e) => handleFilter({ touristType: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded"
            >
              <option value="">All</option>
              <option value="Domestic">Domestic</option>
              <option value="International">International</option>
            </select>
            <label htmlFor="sort" className="text-gray-700">Sort By:</label>
            <select
              id="sort"
              value={searchParams.get('sort') || ''}
              onChange={(e) => handleFilter({ sort: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded"
            >
              <option value="">Default</option>
              <option value="date">Date</option>
              <option value="touristCount">Tourist Count</option>
              <option value="totalPrice">Total Price</option>
            </select>
            <label htmlFor="order" className="text-gray-700">Order:</label>
            <select
              id="order"
              value={searchParams.get('order') || ''}
              onChange={(e) => handleFilter({ order: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="space-x-2">
            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded w-full"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">No.</th>
                <th className="border border-gray-300 px-4 py-2">Email</th>
                <th className="border border-gray-300 px-4 py-2">Tanggal</th>
                <th className="border border-gray-300 px-4 py-2">Tujuan Wisata</th>
                <th className="border border-gray-300 px-4 py-2">Jumlah Pengunjung</th>
                <th className="border border-gray-300 px-4 py-2">Total Harga</th>
                <th className="border border-gray-300 px-4 py-2">Metode Pembayaran</th>
                <th className="border border-gray-300 px-4 py-2">Informasi Pengunjung</th>
                <th className="border border-gray-300 px-4 py-2">Bukti Pembayaran</th>
                <th className="border border-gray-300 px-4 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((order, index) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {(currentPage - 1) * pagination.perPage + index + 1}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{order.email}</td>
                  <td className="border border-gray-300 px-4 py-2">{formatDate(order.date)}</td>
                  <td className="border border-gray-300 px-4 py-2">{order.purpose}</td>
                  <td className="border border-gray-300 px-4 py-2">{order.touristCount} orang</td>
                  <td className="border border-gray-300 px-4 py-2">{order.totalPrice}</td>
                  <td className="border border-gray-300 px-4 py-2">{order.paymentType}</td>
                  <td className="border border-gray-300 px-4 py-2">{order.userInformation}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <img 
                      src={order.paymentProof} 
                      alt="Pembayaran Tunai" 
                      className="w-16 h-16 object-cover"
                      onError={(e) => {
                        e.target.alt = 'Pembayaran Tunai';
                      }}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center space-y-2">
                    <button
                      onClick={() => handleRepost(order)}
                      disabled={isRepostingId === order.id}
                      className={`px-4 py-1 rounded text-white w-full ${
                        isRepostingId === order.id 
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 transition-colors'
                      }`}
                    >
                      {isRepostingId === order.id ? 'Reposting...' : 'Repost'}
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      disabled={isDeletingId === order.id}
                      className={`px-4 py-1 rounded text-white w-full ${
                        isDeletingId === order.id 
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-500 hover:bg-red-600 transition-colors'
                      }`}
                    >
                      {isDeletingId === order.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center items-center gap-4 mt-6 mb-6">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`px-4 py-1 rounded transition-colors ${
              currentPage === 1 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            Previous
          </button>
          <p className="text-gray-700">
            Page {currentPage} of {Math.ceil(pagination.total / pagination.perPage)}
          </p>
          <button
            onClick={handleNextPage}
            disabled={currentPage === Math.ceil(pagination.total / pagination.perPage)}
            className={`px-4 py-1 rounded transition-colors ${
              currentPage === Math.ceil(pagination.total / pagination.perPage)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableOrder;