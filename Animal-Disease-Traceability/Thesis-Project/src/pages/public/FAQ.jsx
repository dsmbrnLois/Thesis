import React from "react";

export default function FAQ() {
  const faqs = [
    {
      question: "What is Hyperledger Fabric?",
      answer: "Hyperledger Fabric is a 'permissioned' blockchain framework. Unlike public cryptocurrencies, it is a private system. In the ADTS network, only authorized personnel—like the City Veterinarian and Barangay Health Officers—can record or verify data, ensuring that every record is backed by an official signature."
    },
    {
      question: "How does Blockchain help in Animal Traceability?",
      answer: "Every time a livestock record is created or updated, it is 'hashed' and stored across a ledger that cannot be altered or deleted. This creates an untamperable audit trail, meaning the history of a cow from Dila or a hog from Sinalhan is permanent and verifiable."
    },
    {
      question: "Why not use a regular database?",
      answer: "Standard databases can be edited or wiped. With Hyperledger, even a system administrator cannot secretly change a transaction once it is finalized. This builds absolute trust between our 18 barangays and the city government."
    },
    {
      question: "Which animals are tracked in ADTS?",
      answer: "Our system currently monitors Hogs, Cows, Chickens, Carabaos, Goats, and Ducks. We track their movement from local farms to the City Slaughterhouse to ensure they are healthy before reaching the public market."
    },
    {
      question: "How is the health status verified?",
      answer: "Animals are tagged with a status: Healthy, Sick, or Unverified. If an animal is flagged as 'Sick' in a barangay like Aplaya, the system immediately locks its record, preventing it from being 'cleared' for slaughter until a City Vet uploads a new health certification."
    }
  ];

  return (
    // transparent background with a slight blur to make it "pop"
    <div className="min-h-screen bg-transparent backdrop-blur-sm py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-500 mb-12 font-semibold">
          Learn more about the technology and livestock monitoring in the ADTS network.
        </p>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="group bg-white/70 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/40 shadow-xl 
                         transition-all duration-300 hover:bg-white/90 hover:-translate-y-2 hover:shadow-green-900/10"
            >
              <h3 className="text-xl font-black text-green-700 mb-3 uppercase tracking-wide group-hover:text-green-500 transition-colors">
                {faq.question}
              </h3>
              <p className="text-slate-700 leading-relaxed font-medium">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>   
  );
}