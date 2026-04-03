import React, { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle, XCircle } from "lucide-react";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { cn } from "../lib/utils";

interface FileUploadProps {
  onDataExtracted: (text: string) => void;
  isProcessing: boolean;
}

export function FileUpload({ onDataExtracted, isProcessing }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const allowedExtensions = ["docx", "txt", "csv", "xls", "xlsx"];

      if (!extension || !allowedExtensions.includes(extension)) {
        setError("Please upload a supported file type (.docx, .txt, .csv, .xls, .xlsx).");
        return;
      }

      setFileName(file.name);
      setError(null);

      try {
        let extractedText = "";

        if (extension === "docx") {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
        } else if (extension === "txt") {
          extractedText = await file.text();
        } else if (extension === "csv") {
          const text = await file.text();
          const result = Papa.parse(text, { header: true, skipEmptyLines: true });
          extractedText = JSON.stringify(result.data);
        } else if (extension === "xls" || extension === "xlsx") {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          extractedText = JSON.stringify(jsonData);
        }

        if (!extractedText.trim()) {
          throw new Error("The file appears to be empty.");
        }

        onDataExtracted(extractedText);
      } catch (err) {
        console.error("Error reading file:", err);
        setError(`Failed to read the .${extension} file.`);
      }
    },
    [onDataExtracted]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center",
          dragActive
            ? "border-blue-500 bg-blue-50/50"
            : "border-gray-200 hover:border-blue-400 bg-white"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".docx,.txt,.csv,.xls,.xlsx"
          onChange={handleChange}
          disabled={isProcessing}
        />

        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          ) : fileName ? (
            <CheckCircle className="w-8 h-8" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {fileName || "Upload Client Information"}
          </h3>
          <p className="text-sm text-gray-500">
            Drag and drop your Client file here, or click to browse
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
            <XCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {fileName && !error && !isProcessing && (
          <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
            <FileText className="w-4 h-4" />
            <span>File loaded successfully</span>
          </div>
        )}
      </div>
    </div>
  );
}
