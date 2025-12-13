import { useState, useEffect, type FormEvent } from "react";
import { Loader, Placeholder, useAuthenticator } from "@aws-amplify/ui-react";
import "./App.css";
import { Amplify } from "aws-amplify";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
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

  // Fetch saved itineraries on mount
  useEffect(() => {
    fetchSavedItineraries();
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
      setShowUpdateModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  // Update existing itinerary
  const updateExistingItinerary = async () => {
    if (!existingMatch || !result || !currentFormData) return;

    setIsSaving(true);
    const { data, errors } = await amplifyClient.models.Itinerary.update({
      id: existingMatch.id,
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
              <button
                onClick={signOut}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Sign Out
              </button>
            </div>
            <p className="description">
              Welcome, {user?.signInDetails?.loginId || "User"}! Simply enter
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
                disabled={isSaving}
                className="update-btn"
              >
                {isSaving ? "Updating..." : "Update Existing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default App;
