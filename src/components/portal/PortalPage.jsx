import { cardStyle, colors, headingStyle, sectionStyle } from '../../styles/appStyles'
import { PortalProfileCards } from './PortalProfileCards'
import { PortalChangeRequestForm } from './PortalChangeRequestForm'
import { PortalChangeRequestsList } from './PortalChangeRequestsList'
import { PortalQrCard } from './PortalQrCard'
import { PortalUpcomingEvents } from './PortalUpcomingEvents'

export function PortalPage({
  currentMember,
  getRoleLabel,
  currentMemberFee,
  portalEmail,
  setPortalEmail,
  portalPhone,
  setPortalPhone,
  portalStreet,
  setPortalStreet,
  portalPostalCode,
  setPortalPostalCode,
  portalCity,
  setPortalCity,
  portalClothingSize,
  setPortalClothingSize,
  submitMemberChangeRequest,
  getMyMemberChangeRequests,
  getMemberQrValue,
  exportMemberCardPdf,
  getUpcomingEvents,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Mein Mitgliederportal</h2>

      {!currentMember ? (
        <div style={{ ...cardStyle, background: colors.dangerBg, borderColor: colors.red }}>
          <strong style={{ color: colors.dangerText }}>Kein Mitglied mit diesem Login verknüpft.</strong>
        </div>
      ) : (
        <>
          <PortalProfileCards
            currentMember={currentMember}
            getRoleLabel={getRoleLabel}
            currentMemberFee={currentMemberFee}
          />

          <PortalChangeRequestForm
            portalEmail={portalEmail}
            setPortalEmail={setPortalEmail}
            portalPhone={portalPhone}
            setPortalPhone={setPortalPhone}
            portalStreet={portalStreet}
            setPortalStreet={setPortalStreet}
            portalPostalCode={portalPostalCode}
            setPortalPostalCode={setPortalPostalCode}
            portalCity={portalCity}
            setPortalCity={setPortalCity}
            portalClothingSize={portalClothingSize}
            setPortalClothingSize={setPortalClothingSize}
            submitMemberChangeRequest={submitMemberChangeRequest}
          />

          <PortalChangeRequestsList getMyMemberChangeRequests={getMyMemberChangeRequests} />

          <PortalQrCard
            currentMember={currentMember}
            getMemberQrValue={getMemberQrValue}
            exportMemberCardPdf={exportMemberCardPdf}
          />

          <PortalUpcomingEvents getUpcomingEvents={getUpcomingEvents} />
        </>
      )}
    </section>
  )
}
