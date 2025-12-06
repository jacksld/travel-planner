import { useState, type FormEvent } from "react";
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


      // Call the GraphQL API
      const { data, errors } = await amplifyClient.queries.askBedrock({
        destination: destination,
        days: days,
        interests: interests,
      });


      if (!errors && data) {
        setResult(data.body || "No itinerary returned");
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
    <div className="app-container">
      <div className="header-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className="main-header">
            Meet Your Personal <span className="highlight">Travel AI</span>
          </h1>
          <button 
            onClick={signOut}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>
        <p className="description">
          Welcome, {user?.signInDetails?.loginId || 'User'}! Simply enter your destination, number of days, and interests (e.g., museums, food, nature), 
          and Travel AI will generate a personalized itinerary on demand...
        </p>
      </div>


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
            min="1"
            max="30"
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
          result && <div className="result">{result}</div>
        )}
      </div>
    </div>
  );
}


export default App;
