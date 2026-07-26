import { useState } from 'react';
import FormStepper from './FormStepper';
import PDFPreview from './PDFPreview';
import DownloadButton from './DownloadButton';

interface LienFormAppProps {
  defaultState: string;
  documentType?: 'mechanics-lien' | 'notice-to-owner';
  productName: string;
  dateType?: 'last-furnishing' | 'first-furnishing';
}

export default function LienFormApp({
  defaultState,
  documentType = 'mechanics-lien',
  productName,
}: LienFormAppProps) {
  const [formData, setFormData] = useState<any>(null);
  const [role, setRole] = useState('');

  const handleFormComplete = (data: any) => {
    setFormData(data);
    setRole(data.role || '');
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-navy-800 mb-6">
          Generate Your {productName}
        </h2>
        <FormStepper
          defaultState={defaultState}
          documentType={documentType}
          onFormComplete={handleFormComplete}
        />
      </div>

      {formData ? (
        <div className="grid md:grid-cols-2 gap-6">
          <PDFPreview formData={formData} state={defaultState} />
          <div className="flex flex-col justify-center">
            <DownloadButton
              state={defaultState}
              role={role}
              formData={formData}
              productName={productName}
            />
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
          <p className="text-lg font-medium">Complete the form above to generate your free PDF</p>
          <p className="text-sm mt-2">Your document preview will appear here</p>
        </div>
      )}
    </div>
  );
}
