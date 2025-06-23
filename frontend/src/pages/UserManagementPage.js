import { useEffect, useState, useMemo } from "react";
import api from "../api";
import UserFormModal from "../components/UserFormModal";

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, kelasRes] = await Promise.all([
        api.get("/users"),
        api.get("/data/kelas"),
      ]);
      setUsers(usersRes.data);
      setKelas(kelasRes.data);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
      alert("Gagal mengambil data dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (id) => {
    const konfirmasi = window.confirm("Anda yakin ingin menghapus pengguna ini?");
    if (!konfirmasi) return;

    try {
      await api.delete(`/users/${id}`);
      fetchData();
    } catch (err) {
      console.error("Gagal menghapus pengguna:", err);
      alert("Gagal menghapus pengguna!");
    }
  };

  const handleFormSubmit = () => {
    setShowModal(false);
    fetchData();
  };

  const groupedUsers = useMemo(() => {
    const groups = {};
    users.forEach((user) => {
      const key = user.kelas || "Tanpa Kelas";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(user);
    });
    return groups;
  }, [users]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manajemen Pengguna</h1>
        <button
          onClick={handleAddUser}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-md transition-colors duration-300"
        >
          + Tambah Pengguna
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">Memuat data...</p>
      ) : (
        <div className="space-y-10">
          {Object.keys(groupedUsers).map((kelasNama) => {
            const currentUsersInClass = groupedUsers[kelasNama];

            return (
              <section key={kelasNama}>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                  Kelas: {kelasNama}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                  {currentUsersInClass.map((user) => (
                    <div key={user.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-lg text-indigo-700">{user.name}</p>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                        <p className="text-sm text-gray-500 capitalize mt-2">
                          <span className="font-semibold">Role:</span> {user.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-4 border-t pt-3">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentUsersInClass.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 capitalize">{user.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-medium flex justify-end items-center gap-4">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {showModal && (
        <UserFormModal
          user={selectedUser}
          kelasList={kelas}
          onClose={() => setShowModal(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

export default UserManagementPage;