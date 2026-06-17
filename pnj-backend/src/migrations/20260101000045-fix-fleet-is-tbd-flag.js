'use strict'

// Fix fleet records that have is_tbd=true but plate_number is not 'TBD'.
// Root cause: is_tbd was not consistently maintained when fleets were created/imported.
// The service layer now derives is_tbd from plate_number at runtime, but we also
// normalise the column so DB queries that filter on is_tbd remain correct.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE fleets
      SET    is_tbd     = FALSE,
             updated_at = NOW()
      WHERE  is_tbd     = TRUE
        AND  UPPER(TRIM(plate_number)) <> 'TBD'
        AND  deleted_at IS NULL
    `)
  },

  async down(queryInterface) {
    // Intentionally a no-op: we cannot safely know which records were incorrectly
    // set before this migration ran, so rolling back would risk re-introducing bad data.
    await Promise.resolve()
  },
}
