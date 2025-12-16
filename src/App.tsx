import { useState, useEffect, type FormEvent } from "react";
import { Loader, Placeholder, useAuthenticator } from "@aws-amplify/ui-react";
import "./App.css";
import { Amplify } from "aws-amplify";
import { fetchUserAttributes } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { updatePassword, updateUserAttribute, fetchUserAttributes } from "aws-amplify/auth";
import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";


Amplify.configure(outputs);


const amplifyClient = generateClient<Schema>({
  authMode: "userPool",
});


function App() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [userName, setUserName] = useState<string>("");

  // State for saved itineraries feature
  const [savedItineraries, setSavedItineraries] = useState<Schema["Itinerary"]["type"][]>([]);
  const [viewMode, setViewMode] = useState<"new" | "saved">("new");
  const [currentItinerary, setCurrentItinerary] = useState<Schema["Itinerary"]["type"] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [currentFormData, setCurrentFormData] = useState<{
    destination: string;
    days: number;
    interests: string[];
  } | null>(null);

  // State for update existing flow
  const [existingMatch, setExistingMatch] = useState<Schema["Itinerary"]["type"] | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [updateName, setUpdateName] = useState<string>("");

  // State for edit modal
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingItinerary, setEditingItinerary] = useState<Schema["Itinerary"]["type"] | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);

  // Profile management state
  const [showChangeNameModal, setShowChangeNameModal] = useState<boolean>(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string>("");

  // Fetch saved itineraries on mount
  useEffect(() => {
    fetchSavedItineraries();
    loadUserDisplayName();
  }, []);


  useEffect(() => {
    const loadUserName = async () => {
      const attributes = await fetchUserAttributes();
      setUserName(attributes.preferred_username || "");
    };
    loadUserName();
  }, []);

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-menu-container')) {
      setProfileMenuOpen(false);
    }
  };

  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
  }, []);


  const fetchSavedItineraries = async () => {
    const { data, errors } = await amplifyClient.models.Itinerary.list();
    if (!errors && data) {
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSavedItineraries(sorted);
    }
  };

  const loadUserDisplayName = async () => {
  try {
    const attributes = await fetchUserAttributes();
    if (attributes.name) {
      setDisplayName(attributes.name);
    }
  } catch (error) {
    console.error("Error fetching user attributes:", error);
    }
  };

  const handleChangeName = async () => {
    if (!newName.trim()) {
      setProfileError("Please enter a name");
      return;
    }

  setProfileLoading(true);
  setProfileError("");

  try {
    await updateUserAttribute({
      userAttribute: {
        attributeKey: "name",
        value: newName.trim(),
      },
    });
    setDisplayName(newName.trim());
    setShowChangeNameModal(false);
    setNewName("");
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : "Failed to update name");
      } finally {
        setProfileLoading(false);
      }
    };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setProfileError("Please fill in all fields");
      return;
    }

  if (newPassword !== confirmPassword) {
    setProfileError("New passwords do not match");
    return;
  }

  if (newPassword.length < 8) {
    setProfileError("Password must be at least 8 characters");
    return;
  }

  setProfileLoading(true);
  setProfileError("");

  try {
    await updatePassword({
      oldPassword: currentPassword,
      newPassword: newPassword,
    });
    setShowChangePasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    alert("Password changed successfully!");
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : "Failed to change password");
      } finally {
        setProfileLoading(false);
      }
    };

  const openChangeNameModal = () => {
    setProfileMenuOpen(false);
    setNewName(displayName);
    setProfileError("");
    setShowChangeNameModal(true);
  };

  const openChangePasswordModal = () => {
    setProfileMenuOpen(false);
    setProfileError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowChangePasswordModal(true);
  };


  const saveItinerary = async () => {
    if (!saveName.trim() || !result || !currentFormData) return;

    setIsSaving(true);
    const { data, errors } = await amplifyClient.models.Itinerary.create({
      name: saveName.trim(),
      destination: currentFormData.destination,
      days: currentFormData.days,
      interests: currentFormData.interests,
      generatedItinerary: result,
    });

    if (!errors && data) {
      setSavedItineraries((prev) => [data, ...prev]);
      setShowSaveModal(false);
      setSaveName("");
    } else {
      alert("Failed to save itinerary. Please try again.");
    }
    setIsSaving(false);
  };

  const deleteItinerary = async (id: string) => {
    if (!confirm("Are you sure you want to delete this itinerary?")) return;

    const { errors } = await amplifyClient.models.Itinerary.delete({ id });
    if (!errors) {
      setSavedItineraries((prev) => prev.filter((item) => item.id !== id));
      if (currentItinerary?.id === id) {
        setViewMode("new");
        setCurrentItinerary(null);
      }
    } else {
      alert("Failed to delete itinerary.");
    }
  };

  const viewSavedItinerary = (itinerary: Schema["Itinerary"]["type"]) => {
    setCurrentItinerary(itinerary);
    setViewMode("saved");
  };

  const createNew = () => {
    setViewMode("new");
    setCurrentItinerary(null);
    setResult("");
    setCurrentFormData(null);
  };

  // Find existing itinerary by destination (case-insensitive)
  const findExistingItinerary = (destination: string) => {
    return (
      savedItineraries.find(
        (item) => item.destination.toLowerCase() === destination.toLowerCase()
      ) || null
    );
  };

  // Handle save button click - check for existing itinerary first
  const handleSaveClick = () => {
    if (!currentFormData) return;

    const existing = findExistingItinerary(currentFormData.destination);
    if (existing) {
      setExistingMatch(existing);
      setUpdateName(existing.name); // Pre-populate with existing name
      setShowUpdateModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  // Update existing itinerary
  const updateExistingItinerary = async () => {
    if (!existingMatch || !result || !currentFormData || !updateName.trim()) return;

    setIsSaving(true);
    const { data, errors } = await amplifyClient.models.Itinerary.update({
      id: existingMatch.id,
      name: updateName.trim(),
      days: currentFormData.days,
      interests: currentFormData.interests,
      generatedItinerary: result,
    });

    if (!errors && data) {
      setSavedItineraries((prev) =>
        prev.map((item) => (item.id === existingMatch.id ? data : item))
      );
      setShowUpdateModal(false);
      setExistingMatch(null);
      setUpdateName(""); // Clear the name
    } else {
      alert("Failed to update itinerary. Please try again.");
    }
    setIsSaving(false);
  };

  // Handle "Save as New" when user chooses not to update existing
  const handleSaveAsNew = () => {
    setShowUpdateModal(false);
    setExistingMatch(null);
    setShowSaveModal(true);
  };

  // Handle edit button click from sidebar
  const handleEditClick = (itinerary: Schema["Itinerary"]["type"]) => {
    setEditingItinerary(itinerary);
    setEditName(itinerary.name);
    setShowEditModal(true);
  };

  // Rename itinerary
  const renameItinerary = async () => {
    if (!editingItinerary || !editName.trim()) return;

    setIsSaving(true);
    const { data, errors } = await amplifyClient.models.Itinerary.update({
      id: editingItinerary.id,
      name: editName.trim(),
    });

    if (!errors && data) {
      setSavedItineraries((prev) =>
        prev.map((item) => (item.id === editingItinerary.id ? data : item))
      );
      setShowEditModal(false);
      setEditingItinerary(null);
      setEditName("");

      // If currently viewing this itinerary, update the view
      if (currentItinerary?.id === editingItinerary.id) {
        setCurrentItinerary(data);
      }
    } else {
      alert("Failed to rename itinerary. Please try again.");
    }
    setIsSaving(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      
      // Get and validate form inputs
      const destination = formData.get("destination")?.toString().trim() || "";
      const daysInput = formData.get("days")?.toString().trim() || "";
      const interestsInput = formData.get("interests")?.toString().trim() || "";
      
      // Validation
      if (!destination) {
        alert("Please enter a destination");
        setLoading(false);
        return;
      }
      
      const days = parseInt(daysInput, 10);
      if (!daysInput || isNaN(days) || days < 1 || days > 30) {
        alert("Please enter a valid number of days (1-30)");
        setLoading(false);
        return;
      }
      
      if (!interestsInput) {
        alert("Please enter at least one interest");
        setLoading(false);
        return;
      }
      
      // Parse interests (comma-separated)
      const interests = interestsInput
        .split(",")
        .map(interest => interest.trim())
        .filter(interest => interest.length > 0);
      
      if (interests.length === 0) {
        alert("Please enter at least one valid interest");
        setLoading(false);
        return;
      }

      // Store form data for potential save
      setCurrentFormData({ destination, days, interests });

      // Call the GraphQL API
      const { data, errors } = await amplifyClient.queries.askBedrock({
        destination: destination,
        days: days,
        interests: interests,
      });


      if (!errors && data) {
        if (data.error) {
          // Display graceful error from bedrock.js
          alert(data.error);
        } else {
          setResult(data.body || "No itinerary returned");
        }
      } else {
        console.error("Errors:", errors);
        alert("Failed to generate itinerary. Please try again.");
      }
    } catch (e) {
      console.error("Error:", e);
      alert(`An error occurred: ${e}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="app-layout">
      {/* Collapsible Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="toggle-btn"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? "«" : "»"}
          </button>
          {sidebarOpen && <h2>Saved Itineraries</h2>}
        </div>

        {sidebarOpen && (
          <>
            <button onClick={createNew} className="create-new-btn">
              + Create New
            </button>

            <ul className="itinerary-list">
              {savedItineraries.map((item) => (
                <li
                  key={item.id}
                  className={currentItinerary?.id === item.id ? "active" : ""}
                >
                  <span onClick={() => viewSavedItinerary(item)}>{item.name}</span>
                  <div className="item-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(item);
                      }}
                      className="edit-btn"
                      aria-label="Edit"
                      title="Edit name"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItinerary(item.id);
                      }}
                      className="delete-btn"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
              {savedItineraries.length === 0 && (
                <li className="empty-message">No saved itineraries yet</li>
              )}
            </ul>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="app-container">
          <div className="header-container">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h1 className="main-header">
                Meet Your Personal <span className="highlight">Travel AI</span>
              </h1>
              <div className="profile-menu-container">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="profile-btn"
              >
                Profile ▾
              </button>
              {profileMenuOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-item profile-user">
                    {displayName || user?.signInDetails?.loginId || "User"}
                  </div>
                  <button className="profile-dropdown-item" onClick={openChangeNameModal}>
                    Change Name
                  </button>
                  <button className="profile-dropdown-item" onClick={openChangePasswordModal}>
                    Change Password
                  </button>
                  <button className="profile-dropdown-item logout" onClick={signOut}>
                    Log Out
                  </button>
                </div>
              )}
            </div>
            </div>
            <p className="description">
              Welcome, {userName || user?.signInDetails?.loginId || "User"}! Simply enter
              your destination, number of days, and interests (e.g., museums,
              food, nature), and Travel AI will generate a personalized
              itinerary on demand...
            </p>
          </div>

          {viewMode === "new" ? (
            <>
              <form onSubmit={onSubmit} className="form-container">
                <div className="search-container">
                  <input
                    type="text"
                    className="wide-input"
                    id="destination"
                    name="destination"
                    placeholder="Enter destination (e.g., Tokyo, Paris, New York)"
                    maxLength={100}
                    required
                  />

                  <input
                    type="number"
                    className="wide-input"
                    id="days"
                    name="days"
                    placeholder="Number of days (1-30)"
                    min={1}
                    max={30}
                    required
                  />

                  <input
                    type="text"
                    className="wide-input"
                    id="interests"
                    name="interests"
                    placeholder="Interests (e.g., museums, food, shopping, nature)"
                    maxLength={200}
                    required
                  />

                  <button type="submit" className="search-button">
                    Generate Itinerary
                  </button>
                </div>
              </form>

              <div className="result-container">
                {loading ? (
                  <div className="loader-container">
                    <p>Loading your itinerary...</p>
                    <Loader size="large" />
                    <Placeholder size="large" />
                    <Placeholder size="large" />
                    <Placeholder size="large" />
                  </div>
                ) : (
                  result && (
                    <>
                      <div className="result">{result}</div>
                      <button onClick={handleSaveClick} className="save-btn">
                        Save Itinerary
                      </button>
                    </>
                  )
                )}
              </div>
            </>
          ) : (
            currentItinerary && (
              <div className="saved-view">
                <h2>{currentItinerary.name}</h2>
                <div className="saved-meta">
                  <p>
                    <strong>Destination:</strong> {currentItinerary.destination}
                  </p>
                  <p>
                    <strong>Days:</strong> {currentItinerary.days}
                  </p>
                  <p>
                    <strong>Interests:</strong>{" "}
                    {currentItinerary.interests.join(", ")}
                  </p>
                </div>
                <div className="result">{currentItinerary.generatedItinerary}</div>
              </div>
            )
          )}
        </div>
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Save Itinerary</h3>
            <input
              type="text"
              placeholder="Enter a name for this itinerary"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => setShowSaveModal(false)} disabled={isSaving}>
                Cancel
              </button>
              <button
                onClick={saveItinerary}
                disabled={!saveName.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Existing Modal */}
      {showUpdateModal && existingMatch && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Existing Itinerary Found</h3>
            <p className="update-message">
              You already have a saved itinerary for{" "}
              <strong>{existingMatch.destination}</strong> named "
              <strong>{existingMatch.name}</strong>".
            </p>
            <input
              type="text"
              placeholder="Itinerary name"
              value={updateName}
              onChange={(e) => setUpdateName(e.target.value)}
              maxLength={100}
              className="update-name-input"
            />
            <p className="update-question">
              Would you like to update it or save as a new itinerary?
            </p>
            <div className="modal-buttons update-buttons">
              <button
                onClick={() => setShowUpdateModal(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button onClick={handleSaveAsNew} disabled={isSaving}>
                Save as New
              </button>
              <button
                onClick={updateExistingItinerary}
                disabled={!updateName.trim() || isSaving}
                className="update-btn"
              >
                {isSaving ? "Updating..." : "Update Existing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {showEditModal && editingItinerary && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Itinerary Name</h3>
            <p className="edit-current-name">
              Current name: <strong>{editingItinerary.name}</strong>
            </p>
            <input
              type="text"
              placeholder="Enter new name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => setShowEditModal(false)} disabled={isSaving}>
                Cancel
              </button>
              <button
                onClick={renameItinerary}
                disabled={!editName.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
          {/* Change Name Modal */}
    {showChangeNameModal && (
      <div className="modal-overlay" onClick={() => setShowChangeNameModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Change Display Name</h3>
          {profileError && <p className="modal-error">{profileError}</p>}
          <input
            type="text"
            placeholder="Enter your name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={50}
            autoFocus
          />
          <div className="modal-buttons">
            <button onClick={() => setShowChangeNameModal(false)} disabled={profileLoading}>
              Cancel
            </button>
            <button onClick={handleChangeName} disabled={!newName.trim() || profileLoading}>
              {profileLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Change Password Modal */}
    {showChangePasswordModal && (
      <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Change Password</h3>
          {profileError && <p className="modal-error">{profileError}</p>}
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="modal-buttons">
            <button onClick={() => setShowChangePasswordModal(false)} disabled={profileLoading}>
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || profileLoading}
            >
              {profileLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}


export default App;
