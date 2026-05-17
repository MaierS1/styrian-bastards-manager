import { cardStyle, colors, dashboardNumberStyle, headingStyle, secondaryButtonStyle, sectionStyle } from '../../styles/appStyles'

export function AdminTestData({
  getTestMembers,
  getTestInvoices,
  getTestCashEntries,
  deleteAllTestData,
  deleteAllTestDataForMember,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Testdaten / Papierkorb</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div style={cardStyle}>
          <strong>Testmitglieder</strong>
          <h2 style={dashboardNumberStyle}>{getTestMembers().length}</h2>
        </div>

        <div style={cardStyle}>
          <strong>Testrechnungen</strong>
          <h2 style={dashboardNumberStyle}>{getTestInvoices().length}</h2>
        </div>

        <div style={cardStyle}>
          <strong>Test-Kassa</strong>
          <h2 style={dashboardNumberStyle}>{getTestCashEntries().length}</h2>
        </div>
      </div>

      <button
        onClick={deleteAllTestData}
        style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
      >
        Alle Testdaten löschen
      </button>

      {getTestMembers().map((member) => (
        <div key={member.id} style={cardStyle}>
          <strong>{member.first_name} {member.last_name}</strong>
          <br />
          {member.email || '-'}
          <br />
          <button
            onClick={() => deleteAllTestDataForMember(member)}
            style={{ ...secondaryButtonStyle, borderColor: colors.red, color: colors.red }}
          >
            Testdaten dieses Mitglieds löschen
          </button>
        </div>
      ))}
    </section>
  )
}
