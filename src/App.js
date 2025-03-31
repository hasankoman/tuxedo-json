import React, { useState } from "react";
import "./App.css";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { JsonView } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import {
  FiCopy,
  FiDownload,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiCheck,
  FiColumns,
  FiMaximize,
  FiMinimize,
  FiClipboard,
} from "react-icons/fi";

function App() {
  const [jsonInput, setJsonInput] = useState("");
  const [parsedJson, setParsedJson] = useState(null);
  const [error, setError] = useState("");
  const [editedValues, setEditedValues] = useState({
    commentary: "",
    template: "nextjs-developer",
    title: "",
    description: "",
    additional_dependencies: [],
    has_additional_dependencies: false,
    install_dependencies_command: "",
    port: "3000",
    file_path: "app/page.tsx",
    code: "",
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [outputJson, setOutputJson] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("input");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [originalCode, setOriginalCode] = useState("");
  const [showDiffView, setShowDiffView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [diffEditorRef, setDiffEditorRef] = useState(null);
  const [editorRef, setEditorRef] = useState(null);

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

      // Convert escaped newlines in code back to actual newlines for editing
      const codeWithNewlines = parsed.code
        ? parsed.code.replace(/\\n/g, "\n")
        : "";

      // Store the original code for diff view
      setOriginalCode(codeWithNewlines);

      setEditedValues({
        commentary: parsed.commentary || "",
        template: "nextjs-developer",
        title: parsed.title || "",
        description: parsed.description || "",
        additional_dependencies: parsed.additional_dependencies || [],
        has_additional_dependencies:
          parsed.has_additional_dependencies || false,
        install_dependencies_command: parsed.install_dependencies_command || "",
        port: "3000",
        file_path: "app/page.tsx",
        code: codeWithNewlines,
      });
      setIsCreatingNew(false);
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
      setParsedJson(null);
    }
  };

  const handleInputChange = (field, value) => {
    let updatedValues = { ...editedValues };

    if (field === "has_additional_dependencies" && value === false) {
      updatedValues = {
        ...updatedValues,
        [field]: value,
        additional_dependencies: [],
        install_dependencies_command: "",
      };
    } else if (field === "install_dependencies_command") {
      // Komut alanını önce güncelle
      updatedValues = { ...updatedValues, [field]: value };

      const command = value.trim().toLowerCase();
      let dependencies = [];
      let commandPrefix = "";

      if (command.startsWith("npm install")) {
        commandPrefix = "npm install";
      } else if (command.startsWith("npm i")) {
        commandPrefix = "npm i";
      } else if (command.startsWith("yarn add")) {
        commandPrefix = "yarn add";
      } else if (command.startsWith("pnpm add")) {
        commandPrefix = "pnpm add";
      }
      // Gerekirse daha fazla paket yöneticisi ekleyin

      if (commandPrefix) {
        dependencies = command
          .substring(commandPrefix.length)
          .split(" ")
          .map((dep) => dep.trim())
          .filter(
            (dep) => dep && !dep.startsWith("-") // Boş stringleri ve bayrakları filtrele
          );
      }

      // Bağımlılıkları yalnızca ayrıştırma sonucuna göre güncelle
      if (dependencies.length > 0) {
        // Bağımlılıklar bulundu: listeyi güncelle ve onay kutusunun işaretli olduğundan emin ol
        updatedValues = {
          ...updatedValues,
          additional_dependencies: dependencies,
          has_additional_dependencies: true, // Bağımlılıklar bulunursa kutuyu otomatik işaretle
        };
      } else {
        // Ayrıştırma başarısız olursa veya hiçbir şey bulamazsa (örn. komut silindi),
        // bağımlılık listesini temizle. Onay kutusunun durumunu değiştirme.
        // Kullanıcı isterse manuel olarak işaretini kaldırabilir.
        updatedValues = {
          ...updatedValues,
          additional_dependencies: [],
        };
      }
    } else {
      // Diğer alanları işle
      updatedValues = {
        ...updatedValues,
        [field]: value,
      };
    }
    setEditedValues(updatedValues);
  };

  const handleDependencyChange = (index, value) => {
    const updatedDependencies = [...editedValues.additional_dependencies];
    updatedDependencies[index] = value;

    // Regenerate install command based on current dependencies
    const commandBase = "npm install "; // Or determine based on project/preference
    const newInstallCommand =
      updatedDependencies.length > 0
        ? commandBase + updatedDependencies.join(" ")
        : "";

    setEditedValues({
      ...editedValues,
      additional_dependencies: updatedDependencies,
      install_dependencies_command: newInstallCommand, // Update command when dependencies change manually
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

    // Regenerate install command based on current dependencies
    const commandBase = "npm install "; // Or determine based on project/preference
    const newInstallCommand =
      updatedDependencies.length > 0
        ? commandBase + updatedDependencies.join(" ")
        : "";

    setEditedValues({
      ...editedValues,
      additional_dependencies: updatedDependencies,
      install_dependencies_command: newInstallCommand, // Update command when dependencies change manually
    });
  };

  const generateJson = () => {
    try {
      const newJson = {
        ...editedValues,
        code: editedValues.code.replace(/\n/g, "\\n"),
        additional_dependencies: editedValues.has_additional_dependencies
          ? editedValues.additional_dependencies
          : [],
        install_dependencies_command: editedValues.has_additional_dependencies
          ? editedValues.install_dependencies_command
          : "",
      };

      const formattedJson = JSON.stringify(newJson, null, 2);
      setOutputJson(formattedJson);
      setShowPreview(true);
    } catch (err) {
      setError(`Error generating JSON: ${err.message}`);
    }
  };

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
    a.download = "updated-tuxedo.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startNewJson = () => {
    setJsonInput("");
    setParsedJson(null);
    setEditedValues({
      commentary: "",
      template: "nextjs-developer",
      title: "",
      description: "",
      additional_dependencies: [],
      has_additional_dependencies: false,
      install_dependencies_command: "",
      port: "3000",
      file_path: "app/page.tsx",
      code: "",
    });
    setIsCreatingNew(true);
    setActiveTab("edit");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const copyOutputCodeToClipboard = () => {
    try {
      const parsedOutput = JSON.parse(outputJson);
      // Get the code value and replace escaped newlines with actual newlines
      const codeToClipboard = parsedOutput.code.replace(/\\n/g, "\n");

      navigator.clipboard
        .writeText(codeToClipboard)
        .then(() => {
          showNotification("Code copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
          showNotification("Failed to copy to clipboard", "error");
        });
    } catch (err) {
      showNotification("Failed to extract code from JSON", "error");
    }
  };

  const copyEditorCodeToClipboard = () => {
    const codeToClipboard = editedValues.code;

    navigator.clipboard
      .writeText(codeToClipboard)
      .then(() => {
        showNotification("Code copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        showNotification("Failed to copy to clipboard", "error");
      });
  };

  const pasteCodeFromClipboard = () => {
    navigator.clipboard
      .readText()
      .then((text) => {
        if (text) {
          handleInputChange("code", text); // Use handleInputChange to update state
          showNotification("Code pasted from clipboard!");
          // Optionally, focus the editor after pasting
          if (editorRef) {
            editorRef.focus();
          } else if (diffEditorRef) {
            diffEditorRef.getModifiedEditor().focus();
          }
        } else {
          showNotification("Clipboard is empty", "warning");
        }
      })
      .catch((err) => {
        console.error("Failed to read clipboard contents: ", err);
        // Check for Permissions API if needed for more robust error handling
        if (err.name === "NotAllowedError" || err.name === "SecurityError") {
          showNotification(
            "Clipboard permission denied. Please allow access in your browser settings.",
            "error"
          );
        } else {
          showNotification("Failed to paste from clipboard", "error");
        }
      });
  };

  return (
    <div className="app-container">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header className="app-header">
        <h1>Tuxedo JSON Editor</h1>
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
            <p className="section-description">
              Paste your tuxedo JSON data here to begin editing or create a new
              JSON from scratch
            </p>
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
            {error && (
              <div className="error-message">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="form-actions">
              <button className="secondary-button" onClick={startNewJson}>
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
            <h2>Edit Tuxedo JSON</h2>
            <p className="section-description">
              Modify the fields below to update your tuxedo json
            </p>

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
                    readOnly
                    value={editedValues.template}
                    onChange={(e) =>
                      handleInputChange("template", e.target.value)
                    }
                    placeholder="Template name"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Port</label>
                    <input
                      type="number"
                      readOnly
                      value={editedValues.port}
                      onChange={(e) =>
                        handleInputChange(
                          "port",
                          parseInt(e.target.value) || ""
                        )
                      }
                      placeholder="3000"
                    />
                  </div>

                  <div className="form-group">
                    <label>File Path</label>
                    <input
                      type="text"
                      readOnly
                      value={editedValues.file_path}
                      onChange={(e) =>
                        handleInputChange("file_path", e.target.value)
                      }
                      placeholder="app/page.tsx"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editedValues.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={3}
                    placeholder="Enter a description for your project"
                  />
                </div>

                <div className="form-group">
                  <label>Commentary</label>
                  <textarea
                    value={editedValues.commentary}
                    onChange={(e) =>
                      handleInputChange("commentary", e.target.value)
                    }
                    rows={4}
                    placeholder="Add detailed commentary about your project"
                  />
                </div>
              </div>

              <div className="form-column">
                <div className="form-group">
                  <div className="checkbox-container">
                    <label
                      className="checkbox-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editedValues.has_additional_dependencies}
                        onChange={(e) =>
                          handleInputChange(
                            "has_additional_dependencies",
                            e.target.checked
                          )
                        }
                        style={{
                          width: "16px",
                          height: "16px",
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
                          <p className="empty-state">
                            No dependencies added yet
                          </p>
                        )}

                        {editedValues.additional_dependencies.map(
                          (dep, index) => (
                            <div key={index} className="dependency-item">
                              <input
                                type="text"
                                value={dep}
                                onChange={(e) =>
                                  handleDependencyChange(index, e.target.value)
                                }
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
                          )
                        )}
                        <button
                          className="secondary-button"
                          onClick={addDependency}
                        >
                          <FiPlus /> Add Dependency
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Install Dependencies Command</label>
                      <input
                        type="text"
                        value={editedValues.install_dependencies_command}
                        onChange={(e) =>
                          handleInputChange(
                            "install_dependencies_command",
                            e.target.value
                          )
                        }
                        placeholder="e.g., npm install package1 package2"
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Code</label>
                  <div
                    className={`editor-container ${
                      isFullscreen ? "fullscreen" : ""
                    }`}
                    style={{ position: "relative" }}
                  >
                    <div className="editor-toolbar">
                      <div className="toolbar-content">
                        <div className="toolbar-group">
                          {!isCreatingNew && (
                            <div className="button-group">
                              <button
                                className={`toolbar-button ${
                                  !showDiffView ? "active" : ""
                                }`}
                                onClick={() => setShowDiffView(false)}
                                title="Switch to normal editor"
                              >
                                <span className="button-icon">
                                  <FiEdit />
                                </span>
                                <span className="button-text">Edit</span>
                              </button>
                              <button
                                className={`toolbar-button ${
                                  showDiffView ? "active" : ""
                                }`}
                                onClick={() => setShowDiffView(true)}
                                title="Show diff with original"
                              >
                                <span className="button-icon">
                                  <FiColumns />
                                </span>
                                <span className="button-text">Diff</span>
                              </button>
                            </div>
                          )}

                          <button
                            className="toolbar-button"
                            onClick={copyEditorCodeToClipboard}
                            title="Copy code to clipboard"
                          >
                            <span className="button-icon">
                              <FiCopy />
                            </span>
                            <span className="button-text">Copy Code</span>
                          </button>
                          <button
                            className="toolbar-button"
                            onClick={pasteCodeFromClipboard}
                            title="Paste code from clipboard"
                          >
                            <span className="button-icon">
                              <FiClipboard />
                            </span>
                            <span className="button-text">Paste Code</span>
                          </button>
                        </div>

                        <div className="toolbar-group">
                          <button
                            className="toolbar-button"
                            onClick={toggleFullscreen}
                            title={
                              isFullscreen
                                ? "Exit fullscreen"
                                : "Enter fullscreen"
                            }
                          >
                            <span className="button-icon">
                              {isFullscreen ? <FiMinimize /> : <FiMaximize />}
                            </span>
                            <span className="button-text">
                              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {showDiffView && !isCreatingNew ? (
                      <div className="diff-container">
                        <div className="diff-labels">
                          <div className="diff-label original">
                            Original Code
                          </div>
                          <div className="diff-label modified">
                            Modified Code
                          </div>
                        </div>
                        <DiffEditor
                          height={isFullscreen ? "calc(100vh - 60px)" : "450px"}
                          language="typescript"
                          original={originalCode}
                          modified={editedValues.code}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            wordWrap: "on",
                            fontSize: 14,
                            lineHeight: 24,
                            readOnly: false,
                            renderSideBySide: true,
                          }}
                          onMount={(editor) => {
                            setDiffEditorRef(editor);
                            // Set modified editor as editable
                            const modifiedEditor = editor.getModifiedEditor();
                            modifiedEditor.onDidChangeModelContent(() => {
                              handleInputChange(
                                "code",
                                modifiedEditor.getValue()
                              );
                            });
                          }}
                          beforeMount={(monaco) => {
                            // Ensure proper cleanup of previous models
                            if (diffEditorRef) {
                              diffEditorRef.dispose();
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <Editor
                        height={isFullscreen ? "calc(100vh - 60px)" : "450px"}
                        defaultLanguage="typescript"
                        value={editedValues.code}
                        onChange={(value) => handleInputChange("code", value)}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          wordWrap: "on",
                          fontSize: 14,
                          lineHeight: 24,
                        }}
                        onMount={(editor) => {
                          setEditorRef(editor);
                        }}
                        beforeMount={(monaco) => {
                          // Ensure proper cleanup
                          if (editorRef) {
                            editorRef.dispose();
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="secondary-button"
                onClick={() => setActiveTab("input")}
              >
                Back to Input
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  generateJson();
                  setActiveTab("output");
                }}
              >
                <FiCheck /> Generate JSON
              </button>
            </div>
          </div>
        )}

        {activeTab === "output" && showPreview && (
          <div className="card">
            <h2>Output JSON</h2>
            <p className="section-description">
              Review, copy or download the updated JSON
            </p>

            <div className="preview-container">
              <JsonView data={JSON.parse(outputJson)} />
            </div>

            <div className="form-actions">
              <button
                className="secondary-button"
                onClick={() => setActiveTab("edit")}
              >
                Back to Editor
              </button>
              <div className="action-buttons">
                <button
                  className="icon-button primary"
                  onClick={copyOutputCodeToClipboard}
                  title="Copy code to clipboard"
                >
                  <FiCopy /> Copy Code
                </button>
                <button
                  className="icon-button primary"
                  onClick={copyToClipboard}
                  title="Copy JSON to clipboard"
                >
                  <FiCopy /> Copy JSON
                </button>
                <button
                  className="icon-button success"
                  onClick={downloadJson}
                  title="Download JSON file"
                >
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
