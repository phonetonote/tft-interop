export function getDateString(theDate = new Date()) {
  return new Date(theDate).toUTCString();
}

export function getMonthName(d) {
  return new Date(d).toLocaleString("default", { month: "long" });
}

export function bumpDate(theDate) {
  //every node needs a unique created att
  theDate.setSeconds(theDate.getSeconds() + 1);
  return theDate;
}

export const yearlyMonthStringFromDate = (
  date: Date,
  downcase = false
): string => {
  const year = date.getFullYear().toString();
  const formattedMonthName = downcase
    ? getMonthName(date).toLowerCase()
    : getMonthName(date);

  return `${formattedMonthName} ${year}`;
};
