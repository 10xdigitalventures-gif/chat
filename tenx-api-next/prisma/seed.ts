import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminRoleId = '22222222-0000-0000-0000-000000000001'
  const consultantRoleId = '22222222-0000-0000-0000-000000000002'
  const clientRoleId = '22222222-0000-0000-0000-000000000003'

  await prisma.appRole.createMany({
    data: [
      { id: adminRoleId, roleName: 'Admin Role' },
      { id: consultantRoleId, roleName: 'Consultant Role' },
      { id: clientRoleId, roleName: 'Client Role' },
    ],
  })

  const locId = '44444444-0000-0000-0000-000000000001'
  const ltId = '33333333-0000-0000-0000-000000000001'

  await prisma.locationType.create({
    data: { id: ltId, locationTypeName: 'Head Office', shortName: 'HO' }
  })

  await prisma.location.create({
    data: { id: locId, locationName: 'Head Office', locationTypeId: ltId, locationAddress: 'Address, Lahore, Pakistan' }
  })

  await prisma.fiscalYear.create({
    data: { id: '11111111-0000-0000-0000-000000000002', name: 'Financial Year 2026-2027', startDate: new Date('2026-07-01'), endDate: new Date('2027-06-30'), isCurrent: true }
  })

  const hashedPassword = await bcrypt.hash('Admin@123', 11)

  await prisma.appUser.create({
    data: {
      id: 'AAAAAAAA-0000-0000-0000-000000000001',
      userName: 'System Administrator',
      loginId: 'admin@htag.mhm',
      email: 'admin@htag.mhm',
      passwordHash: hashedPassword,
      roleId: adminRoleId,
      isActive: true,
    }
  })

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
