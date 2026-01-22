'use client';

import { Award, Calendar, Clock, Download } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CertificateProps {
    id: string;
    courseName: string;
    name: string;
    bannerImage: string | null;
    issuedOn: string; // ISO date string
    expiresAt: string | null; // ISO date string or null
    enrollmentId: string;
}

export default function CertificateCard({ cert }: { cert: CertificateProps }) {
    const isExpired = cert.expiresAt ? new Date(cert.expiresAt) < new Date() : false;

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
            {/* Banner Section */}
            <div className="relative aspect-[3/2] bg-slate-100 overflow-hidden">
                {cert.bannerImage ? (
                    <Image
                        src={cert.bannerImage}
                        alt={cert.name}
                        fill
                        className={cn("object-cover transition-transform duration-500 group-hover:scale-105", isExpired && "grayscale")}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 p-4 text-center">
                        <Award className="h-16 w-16 mb-2 opacity-50" />
                        <span className="font-bold text-lg opacity-75">{cert.name}</span>
                    </div>
                )}

                {/* Overlay Status */}
                <div className="absolute top-2 right-2">
                    {isExpired ? (
                        <span className="bg-red-100/90 backdrop-blur text-red-700 text-xs font-bold px-2 py-1 rounded">
                            EXPIRED
                        </span>
                    ) : (
                        <span className="bg-green-100/90 backdrop-blur text-green-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                            <Award className="h-3 w-3" /> ACTIVE
                        </span>
                    )}
                </div>
            </div>

            {/* Info Section */}
            <div className="p-5 flex flex-col flex-1">
                <div className="mb-4">
                    <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">
                        Certificate
                    </p>
                    <h3 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2" title={cert.name}>
                        {cert.name}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-1">
                        For: <span className="font-medium text-slate-700">{cert.courseName}</span>
                    </p>
                </div>

                <div className="mt-auto space-y-2 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Issued
                        </span>
                        <span className="font-medium text-slate-700">
                            {format(new Date(cert.issuedOn), 'MMM dd, yyyy')}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Valid Until
                        </span>
                        <span className={cn("font-medium", isExpired ? "text-red-600" : "text-slate-700")}>
                            {cert.expiresAt ? format(new Date(cert.expiresAt), 'MMM dd, yyyy') : 'No Expiry'}
                        </span>
                    </div>
                </div>

                <button
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium text-sm py-2 rounded-lg transition-colors border border-slate-200"
                    onClick={() => alert("Review Feature Coming Soon")}
                >
                    <Download className="h-4 w-4" /> Download
                </button>
            </div>
        </div>
    );
}
