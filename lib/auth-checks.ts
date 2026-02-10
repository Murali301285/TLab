import { prisma } from '@/lib/prisma';

export async function checkCompanyValidity(companyId: string) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { plan: true }
    });

    if (!company) {
        return { valid: false, message: 'Company not found' };
    }

    if (!company.isActive) {
        return { valid: false, message: 'Company account is inactive. Contact support.' };
    }

    if (company.licenseExpiresAt && new Date() > company.licenseExpiresAt) {
        return { valid: false, message: 'Company license has expired. Please renew.' };
    }

    return { valid: true, company };
}

export async function checkPlanLimit(companyId: string, limitType: 'users' | 'storage' | 'courses') {
    const { valid, company, message } = await checkCompanyValidity(companyId);
    if (!valid || !company || !company.plan) return { allowed: false, message };

    const plan = company.plan;

    if (limitType === 'users') {
        const userCount = await prisma.user.count({ where: { companyId } });
        if (userCount >= plan.userLimit) {
            return { allowed: false, message: `User limit reached (${plan.userLimit}). Upgrade plan.` };
        }
    }

    // Add other limit checks as needed (storage, etc.)

    return { allowed: true };
}
