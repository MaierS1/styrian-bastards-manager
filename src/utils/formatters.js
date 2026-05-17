export function formatCustomerAddressFromFields(data) {
  const streetLine = [data.customer_street || data.street, data.customer_house_number || data.house_number]
    .filter(Boolean)
    .join(' ')

  return [
    streetLine,
    data.customer_address_addition || data.address_addition,
    [data.customer_postal_code || data.postal_code, data.customer_city || data.city]
      .filter(Boolean)
      .join(' '),
    data.customer_country || data.country,
  ]
    .filter((line) => line && String(line).trim())
    .join(', ')
}
