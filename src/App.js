import React, { useState, useEffect } from "react";
import "./App.css";
import Editor from "@monaco-editor/react";
import { JsonView } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { FiCopy, FiDownload, FiPlus, FiTrash2, FiEdit, FiCheck, FiEye } from "react-icons/fi";

function App() {
  const [jsonInput, setJsonInput] = useState("");
  const [parsedJson, setParsedJson] = useState(null);
  const [error, setError] = useState("");
  const [editedValues, setEditedValues] = useState({
    commentary: "",
    template: "",
    title: "",
    description: "",
    additional_dependencies: [],
    has_additional_dependencies: false,
    install_dependencies_command: "",
    port: "",
    file_path: "",
    code: "",
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [outputJson, setOutputJson] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("input");
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const handleJsonInputChange = (value) => {
    setJsonInput(value);
    try {
      setError("");
      if (value.trim() === "") {
        setParsedJson(null);
        return;
      }

      const parsed = JSON.parse(value);
      setParsedJson(parsed);

      // Update the form fields with the parsed JSON values
      setEditedValues({
        commentary: parsed.commentary || "",
        template: parsed.template || "",
        title: parsed.title || "",
        description: parsed.description || "",
        additional_dependencies: parsed.additional_dependencies || [],
        has_additional_dependencies:
          parsed.has_additional_dependencies || false,
        install_dependencies_command: parsed.install_dependencies_command || "",
        port: parsed.port || "",
        file_path: parsed.file_path || "",
        code: parsed.code || "",
      });
      setIsCreatingNew(false);
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
      setParsedJson(null);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "has_additional_dependencies" && value === false) {
      // When unchecking the box, clear all dependencies and the install command
      setEditedValues({
        ...editedValues,
        [field]: value,
        additional_dependencies: [],
        install_dependencies_command: ""
      });
    } else {
      setEditedValues({
        ...editedValues,
        [field]: value,
      });
    }
  };

  const handleDependencyChange = (index, value) => {
    const updatedDependencies = [...editedValues.additional_dependencies];
    updatedDependencies[index] = value;
    setEditedValues({
      ...editedValues,
      additional_dependencies: updatedDependencies,
    });
  };

  const addDependency = () => {
    setEditedValues({
      ...editedValues,
      additional_dependencies: [...editedValues.additional_dependencies, ""],
    });
  };

  const removeDependency = (index) => {
    const updatedDependencies = [...editedValues.additional_dependencies];
    updatedDependencies.splice(index, 1);
    setEditedValues({
      ...editedValues,
      additional_dependencies: updatedDependencies,
    });
  };

  const generateJson = () => {
    try {
      const newJson = {
        ...editedValues,
        additional_dependencies: editedValues.has_additional_dependencies 
          ? editedValues.additional_dependencies 
          : [],
        install_dependencies_command: editedValues.has_additional_dependencies
          ? editedValues.install_dependencies_command
          : ""
      };

      const formattedJson = JSON.stringify(newJson, null, 2);
      setOutputJson(formattedJson);
      setShowPreview(true);
    } catch (err) {
      setError(`Error generating JSON: ${err.message}`);
    }
  };

  // Show notification function
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(outputJson)
      .then(() => {
        showNotification("JSON copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        showNotification("Failed to copy to clipboard", "error");
      });
  };

  const downloadJson = () => {
    const blob = new Blob([outputJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "updated-portfolio.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startNewJson = () => {
    // Reset form to empty values
    setEditedValues({
      commentary: "",
      template: "",
      title: "",
      description: "",
      additional_dependencies: [],
      has_additional_dependencies: false,
      install_dependencies_command: "",
      port: "",
      file_path: "",
      code: "",
    });
    setIsCreatingNew(true);
    setActiveTab("edit");
  };

  return (
    <div className="app-container">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <header className="app-header">
        <h1>Portfolio JSON Editor</h1>
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === "input" ? "active" : ""}`}
            onClick={() => setActiveTab("input")}
          >
            Input
          </button>
          <button 
            className={`tab-button ${activeTab === "edit" ? "active" : ""}`}
            onClick={() => setActiveTab("edit")}
            disabled={!parsedJson && !isCreatingNew}
          >
            Create/Edit
          </button>
          <button 
            className={`tab-button ${activeTab === "output" ? "active" : ""}`}
            onClick={() => setActiveTab("output")}
            disabled={!showPreview}
          >
            Output
          </button>
        </div>
      </header>

      <div className="content-container">
        {activeTab === "input" && (
          <div className="card">
            <h2>Input JSON</h2>
            <p className="section-description">Paste your portfolio JSON data here to begin editing or create a new JSON from scratch</p>
            <div className="editor-container">
              <Editor
                height="400px"
                defaultLanguage="json"
                value={jsonInput}
                onChange={handleJsonInputChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  fontSize: 14,
                  lineHeight: 24,
                }}
              />
            </div>
            {error && <div className="error-message"><span>⚠️</span> {error}</div>}

            <div className="form-actions">
              <button
                className="secondary-button"
                onClick={startNewJson}
              >
                <FiPlus /> Create New
              </button>
              
              {parsedJson && (
                <button
                  className="primary-button"
                  onClick={() => setActiveTab("edit")}
                >
                  <FiEdit /> Edit Fields
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "edit" && (parsedJson || isCreatingNew) && (
          <div className="card">
            <h2>Edit Portfolio Data</h2>
            <p className="section-description">Modify the fields below to update your portfolio data</p>
            
            <div className="form-grid">
              <div className="form-column">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editedValues.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Project title"
                  />
                </div>

                <div className="form-group">
                  <label>Template</label>
                  <input
                    type="text"
                    value={editedValues.template}
                    onChange={(e) => handleInputChange("template", e.target.value)}
                    placeholder="Template name"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Port</label>
                    <input
                      type="number"
                      value={editedValues.port}
                      onChange={(e) => handleInputChange("port", parseInt(e.target.value) || "")}
                      placeholder="3000"
                    />
                  </div>

                  <div className="form-group">
                    <label>File Path</label>
                    <input
                      type="text"
                      value={editedValues.file_path}
                      onChange={(e) => handleInputChange("file_path", e.target.value)}
                      placeholder="app/page.tsx"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editedValues.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                    placeholder="Enter a description for your project"
                  />
                </div>

                <div className="form-group">
                  <label>Commentary</label>
                  <textarea
                    value={editedValues.commentary}
                    onChange={(e) => handleInputChange("commentary", e.target.value)}
                    rows={4}
                    placeholder="Add detailed commentary about your project"
                  />
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <div className="checkbox-container">
                    <label className="checkbox-label" style={{display: "flex", alignItems: "center", gap: "8px"}}>
                      <input
                        type="checkbox"
                        checked={editedValues.has_additional_dependencies}
                        onChange={(e) => handleInputChange("has_additional_dependencies", e.target.checked)}
                        style={{
                          width: "16px",
                          height: "16px"
                        }}
                      />
                      Has Additional Dependencies
                    </label>
                  </div>
                </div>
                
                {editedValues.has_additional_dependencies && (
                  <>
                    <div className="form-group">
                      <label>Additional Dependencies</label>
                      <div className="dependencies-container">
                        {editedValues.additional_dependencies.length === 0 && (
                          <p className="empty-state">No dependencies added yet</p>
                        )}
                        
                        {editedValues.additional_dependencies.map((dep, index) => (
                          <div key={index} className="dependency-item">
                            <input
                              type="text"
                              value={dep}
                              onChange={(e) => handleDependencyChange(index, e.target.value)}
                              placeholder="e.g., react-router-dom"
                            />
                            <button
                              className="icon-button danger"
                              onClick={() => removeDependency(index)}
                              title="Remove dependency"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        ))}
                        <button className="secondary-button" onClick={addDependency}>
                          <FiPlus /> Add Dependency
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Install Dependencies Command</label>
                      <input
                        type="text"
                        value={editedValues.install_dependencies_command}
                        onChange={(e) => handleInputChange("install_dependencies_command", e.target.value)}
                        placeholder="e.g., npm install"
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Code</label>
                  <div className="editor-container">
                    <Editor
                      height="300px"
                      defaultLanguage="javascript"
                      value={editedValues.code}
                      onChange={(value) => handleInputChange("code", value)}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        wordWrap: "on",
                        fontSize: 14,
                        lineHeight: 24,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="secondary-button" onClick={() => setActiveTab("input")}>
                Back to Input
              </button>
              <button className="primary-button" onClick={() => {
                generateJson();
                setActiveTab("output");
              }}>
                <FiCheck /> Generate JSON
              </button>
            </div>
          </div>
        )}

        {activeTab === "output" && showPreview && (
          <div className="card">
            <h2>Output JSON</h2>
            <p className="section-description">Review, copy or download the updated JSON</p>
            
            <div className="preview-container">
              <JsonView data={JSON.parse(outputJson)} />
            </div>
            
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setActiveTab("edit")}>
                Back to Editor
              </button>
              <div className="action-buttons">
                <button className="icon-button primary" onClick={copyToClipboard} title="Copy to clipboard">
                  <FiCopy /> Copy
                </button>
                <button className="icon-button success" onClick={downloadJson} title="Download JSON file">
                  <FiDownload /> Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
