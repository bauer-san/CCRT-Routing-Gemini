import React, { useRef, useState } from "react";
import { MapPin, Phone, FileText, Users, ChevronRight, Map as MapIcon, Loader2 } from "lucide-react";
import { DeliveryManifest } from "../types";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ManifestDisplayProps {
  manifests: DeliveryManifest[];
}

export function ManifestDisplay({ manifests }: ManifestDisplayProps) {
  const [isExporting, setIsExporting] = useState(false);
  const manifestRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (manifests.length === 0) return null;

  const exportAllToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let y = margin;

      const checkNewPage = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      for (let i = 0; i < manifests.length; i++) {
        const manifest = manifests[i];
        if (i > 0) {
          pdf.addPage();
          y = margin;
        }

        // Header
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.setTextColor(37, 99, 235); // blue-600
        pdf.text(`CCRT Delivery Manifest - Team ${manifest.teamId}`, margin, y);
        y += 10;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
        y += 5;
        const deliveryClients = manifest.clients.filter(c => c.name !== "CCRT HQ");
        pdf.text(`Total Stops: ${deliveryClients.length}`, margin, y);
        y += 7;

        // Google Maps URL
        pdf.setFontSize(10);
        pdf.setTextColor(37, 99, 235); // blue-600
        pdf.setFont("helvetica", "bold");
        const linkLabel = `Google Maps Route - Team ${manifest.teamId}`;
        pdf.text(linkLabel, margin, y);
        
        // Add clickable link
        const linkWidth = pdf.getTextWidth(linkLabel);
        pdf.link(margin, y - 4, linkWidth, 6, { url: manifest.googleMapsUrl });
        
        y += 15;

        // Clients
        deliveryClients.forEach((client, index) => {
          // Estimate height needed for this client block
          const clientBlockHeight = 35;
          checkNewPage(clientBlockHeight);

          // Client Header
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(0);
          pdf.text(`${index + 1}. ${client.name}`, margin, y);
          y += 6;

          // Address & Phone
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(50);
          const contactInfo = `${client.address}${client.phone ? ` | ${client.phone}` : ""}`;
          pdf.text(contactInfo, margin, y);
          y += 6;

          // Delivery Type
          if (client.deliveryType) {
            pdf.setFont("helvetica", "bold");
            pdf.text("Delivery Type: ", margin, y);
            const labelWidth = pdf.getTextWidth("Delivery Type: ");
            pdf.setFont("helvetica", "normal");
            pdf.text(client.deliveryType, margin + labelWidth, y);
            y += 6;
          }

          // Status/Comment
          if (client.status || client.notes) {
            pdf.setFont("helvetica", "bold");
            pdf.text("Comment: ", margin, y);
            const labelWidth = pdf.getTextWidth("Comment: ");
            pdf.setFont("helvetica", "normal");
            const comment = [client.status, client.notes].filter(Boolean).join(" - ");
            
            // Handle long comments with text wrapping
            const splitComment = pdf.splitTextToSize(comment, pageWidth - margin * 2 - labelWidth);
            pdf.text(splitComment, margin + labelWidth, y);
            y += (splitComment.length * 5);
          }

          y += 8; // Spacer between clients
          
          // Draw a light separator line
          pdf.setDrawColor(240);
          pdf.line(margin, y - 4, pageWidth - margin, y - 4);
        });
      }

      pdf.save(`CCRT-Manifests-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 space-y-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Delivery Manifests</h2>
            <p className="text-sm text-gray-500">Optimized routes for {manifests.length} teams</p>
          </div>
        </div>
        
        <button 
          onClick={exportAllToPDF}
          disabled={isExporting}
          className={cn(
            "flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            isExporting && "animate-pulse"
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Export All to PDF
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-12">
        {manifests.map((manifest, index) => (
          <motion.div
            key={manifest.teamId}
            ref={(el) => (manifestRefs.current[index] = el)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-100">
                  {manifest.teamId}
                </span>
                <div>
                  <h3 className="font-extrabold text-gray-900 uppercase tracking-widest text-sm">
                    Team {manifest.teamId}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Delivery Route</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Service Time</p>
                  <p className="text-sm font-bold text-gray-900">{manifest.totalServiceTime}m</p>
                </div>
                <span className="text-sm font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                  {manifest.clients.filter(c => c.name !== "CCRT HQ").length} Stops
                </span>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-8 space-y-6">
              {manifest.clients.filter(c => c.name !== "CCRT HQ").map((client, cIndex) => (
                <div
                  key={client.id}
                  className="p-6 rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all group relative bg-white"
                >
                  <div className="flex items-start gap-6">
                    <div className="mt-1 w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all text-xs font-black shadow-inner">
                      {cIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-xl font-black tracking-tight text-gray-900">
                          {client.name}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {client.deliveryType && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                              {client.deliveryType}
                            </span>
                          )}
                          {client.status && (
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100">
                              {client.status}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                          <span className="font-medium leading-relaxed">{client.address}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 flex-shrink-0 text-blue-400" />
                            <span className="font-bold tracking-tight">{client.phone}</span>
                          </div>
                        )}
                      </div>

                      {client.notes && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 italic border-l-4 border-blue-200 font-medium">
                          {client.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
              <a
                href={manifest.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-blue-600 border border-blue-700 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <MapIcon className="w-4 h-4" />
                View on Google Maps
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
