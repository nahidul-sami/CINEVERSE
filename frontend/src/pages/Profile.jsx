import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../api/authApi";

const Profile = ({ onLogout }) => {
    const [user, setUser] = useState(null);
    const [newName, setNewName] = useState("");
    const [authMessage, setAuthMessage] = useState("");

    const fetchUserProfile = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            setUser(false);
            setAuthMessage("Please log in first to view your profile.");
            return;
        }

        try {
            const res = await getProfile();
            setUser(res.data);
            setNewName(res.data.name || "");
            setAuthMessage("");
        } catch (err) {
            console.error("Error fetching profile:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem("token");
                setUser(false);
                setAuthMessage("Your session has expired. Please log in again.");
                return;
            }

            setUser(false);
            setAuthMessage("Server is temporarily unavailable. Your login is still saved.");
        }
    };

    useEffect(() => {
        const profileRequest = setTimeout(fetchUserProfile, 0);

        return () => clearTimeout(profileRequest);
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await updateProfile({ name: newName });
            setUser(res.data.user);
            alert("Profile Updated Successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Failed to update profile. Please log in again.");
        }
    };

    const handleLogoutClick = () => {
        localStorage.removeItem("token");
        if (onLogout) onLogout();
    };

    if (user === null) return <p>Loading Profile...</p>;

    if (!user) {
        return (
            <div>
                <h2>User Profile</h2>
                <p>{authMessage || "Profile unavailable"}</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, border: '1px solid #ddd', borderRadius: 12 }}>
            <h2>User Profile</h2>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>

            <form onSubmit={handleUpdate}>
                <label>Change Name:</label>
                <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    style={{ width: '100%', padding: 10, marginTop: 8, marginBottom: 12, boxSizing: 'border-box' }}
                />
                <button type="submit" style={{ marginRight: 8 }}>Update Name</button>
                <button type="button" onClick={handleLogoutClick}>Logout</button>
            </form>
        </div>
    );
};

export default Profile;